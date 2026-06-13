import { Activity, ActivityStream } from '@/types'

interface GpxPoint {
  lat: number
  lon: number
  ele?: number
  time?: Date
  extensions?: { heartrate?: number; speed?: number }
}

interface ParsedGpx {
  tracks: Array<{
    name?: string
    points: GpxPoint[]
  }>
}

function parseGpxXml(xml: string): ParsedGpx {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const tracks: ParsedGpx['tracks'] = []

  doc.querySelectorAll('trk').forEach((trk) => {
    const name = trk.querySelector('name')?.textContent ?? undefined
    const points: GpxPoint[] = []

    trk.querySelectorAll('trkpt').forEach((pt) => {
      const lat = parseFloat(pt.getAttribute('lat') ?? '0')
      const lon = parseFloat(pt.getAttribute('lon') ?? '0')
      const ele = pt.querySelector('ele')?.textContent
        ? parseFloat(pt.querySelector('ele')!.textContent!)
        : undefined
      const timeStr = pt.querySelector('time')?.textContent
      const time = timeStr ? new Date(timeStr) : undefined

      const hrEl = pt.querySelector('heartrate, hr, gpxtpx\\:hr, ns3\\:hr')
      const heartrate = hrEl ? parseInt(hrEl.textContent ?? '0') : undefined

      const speedEl = pt.querySelector('speed, gpxtpx\\:speed')
      const speed = speedEl ? parseFloat(speedEl.textContent ?? '0') : undefined

      points.push({ lat, lon, ele, time, extensions: { heartrate, speed } })
    })

    tracks.push({ name, points })
  })

  return { tracks }
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function parseGpxFile(xml: string, filename: string): {
  activity: Activity
  stream: ActivityStream
} {
  const parsed = parseGpxXml(xml)
  const track = parsed.tracks[0]
  if (!track || track.points.length === 0) throw new Error('No track data in GPX')

  const points = track.points
  const timeArr: number[] = []
  const distArr: number[] = []
  const hrArr: number[] = []
  const velArr: number[] = []
  const altArr: number[] = []
  const latlng: [number, number][] = []

  let totalDist = 0
  const startTime = points[0].time?.getTime() ?? 0

  points.forEach((pt, i) => {
    if (i > 0) {
      const prev = points[i - 1]
      totalDist += haversineDistance(prev.lat, prev.lon, pt.lat, pt.lon)

      if (pt.time && prev.time) {
        const dt = (pt.time.getTime() - prev.time.getTime()) / 1000
        const ds = haversineDistance(prev.lat, prev.lon, pt.lat, pt.lon)
        const vel = dt > 0 ? ds / dt : 0
        velArr.push(vel)
      }
    } else {
      velArr.push(0)
    }

    timeArr.push(pt.time ? (pt.time.getTime() - startTime) / 1000 : i)
    distArr.push(totalDist)
    if (pt.extensions?.heartrate) hrArr.push(pt.extensions.heartrate)
    if (pt.ele !== undefined) altArr.push(pt.ele)
    latlng.push([pt.lat, pt.lon])
  })

  const duration =
    points[0].time && points[points.length - 1].time
      ? (points[points.length - 1].time!.getTime() - points[0].time.getTime()) / 1000
      : timeArr[timeArr.length - 1]

  const avgHR = hrArr.length > 0 ? hrArr.reduce((a, b) => a + b, 0) / hrArr.length : undefined
  const maxHR = hrArr.length > 0 ? Math.max(...hrArr) : undefined
  const avgSpeed = totalDist > 0 && duration > 0 ? totalDist / duration : 0
  const avgPace = avgSpeed > 0 ? 1000 / avgSpeed : undefined

  let elevGain = 0
  for (let i = 1; i < altArr.length; i++) {
    const diff = altArr[i] - altArr[i - 1]
    if (diff > 0) elevGain += diff
  }

  const id = `gpx-${Date.now()}`
  const activity: Activity = {
    id,
    name: track.name ?? filename.replace('.gpx', ''),
    date: points[0].time?.toISOString() ?? new Date().toISOString(),
    distance: totalDist,
    duration,
    elevationGain: elevGain,
    avgHeartRate: avgHR,
    maxHeartRate: maxHR,
    avgPace,
    type: 'Run',
    source: 'gpx',
  }

  const stream: ActivityStream = {
    time: timeArr,
    distance: distArr,
    heartrate: hrArr.length > 0 ? hrArr : undefined,
    velocity: velArr,
    altitude: altArr.length > 0 ? altArr : undefined,
    latlng,
  }

  return { activity, stream }
}
