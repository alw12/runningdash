import { Activity, ActivityStream } from '@/types'

interface GpxPoint {
  lat: number
  lon: number
  ele?: number
  time?: Date
  hr?: number
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Extract HR values per trkpt from raw XML via regex.
// Handles: <gpxtpx:hr>, <ns3:hr>, <http://...:hr>, <hr>
function extractAllHR(rawXml: string): (number | undefined)[] {
  const results: (number | undefined)[] = []
  // Split on trkpt opening tags
  const blocks = rawXml.split(/<trkpt[\s>]/)
  blocks.shift() // first block is before any trkpt
  for (const block of blocks) {
    const m = block.match(/:hr>(\d+)<\/|<hr>(\d+)<\/hr>/)
    results.push(m ? parseInt(m[1] ?? m[2]) : undefined)
  }
  return results
}

// Extract track names from raw XML (avoids namespace issues)
function extractTrackNames(rawXml: string): string[] {
  const names: string[] = []
  const trackBlocks = rawXml.split(/<trk[\s>]/)
  trackBlocks.shift()
  for (const block of trackBlocks) {
    const m = block.match(/<name[^>]*>([\s\S]*?)<\/name>/)
    names.push(m ? m[1].trim() : '')
  }
  return names
}

// Count trkpt elements before each trk — used to align HR array index
function countTrkptsBefore(rawXml: string, trackIndex: number): number {
  const trackBlocks = rawXml.split(/<trk[\s>]/)
  let count = 0
  for (let i = 1; i <= trackIndex; i++) {
    const block = trackBlocks[i] ?? ''
    count += (block.match(/<trkpt[\s>]/g) ?? []).length
  }
  return count
}

function buildActivityFromPoints(
  points: GpxPoint[],
  name: string,
  index: number
): { activity: Activity; stream: ActivityStream } {
  if (points.length === 0) throw new Error('Track vuoto')

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
      const ds = haversineDistance(prev.lat, prev.lon, pt.lat, pt.lon)
      totalDist += ds
      if (pt.time && prev.time) {
        const dt = (pt.time.getTime() - prev.time.getTime()) / 1000
        velArr.push(dt > 0 ? ds / dt : 0)
      } else {
        velArr.push(0)
      }
    } else {
      velArr.push(0)
    }

    timeArr.push(pt.time ? (pt.time.getTime() - startTime) / 1000 : i)
    distArr.push(totalDist)
    if (pt.hr !== undefined) hrArr.push(pt.hr)
    if (pt.ele !== undefined) altArr.push(pt.ele)
    latlng.push([pt.lat, pt.lon])
  })

  const first = points[0]
  const last = points[points.length - 1]
  const duration =
    first.time && last.time
      ? (last.time.getTime() - first.time.getTime()) / 1000
      : timeArr[timeArr.length - 1]

  const avgSpeed = totalDist > 0 && duration > 0 ? totalDist / duration : 0
  const avgPace = avgSpeed > 0 ? 1000 / avgSpeed : undefined
  const avgHR = hrArr.length > 0 ? hrArr.reduce((a, b) => a + b, 0) / hrArr.length : undefined
  const maxHR = hrArr.length > 0 ? Math.max(...hrArr) : undefined

  let elevGain = 0
  for (let i = 1; i < altArr.length; i++) {
    const diff = altArr[i] - altArr[i - 1]
    if (diff > 0) elevGain += diff
  }

  const id = `gpx-${first.time?.getTime() ?? Date.now()}-${index}`

  const activity: Activity = {
    id,
    name: name || `Corsa ${index + 1}`,
    date: first.time?.toISOString() ?? new Date().toISOString(),
    distance: totalDist,
    duration,
    elevationGain: elevGain,
    avgHeartRate: avgHR,
    maxHeartRate: maxHR,
    avgPace,
    type: 'Run',
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

export function parseGpxFile(
  xml: string,
  filename: string
): { activity: Activity; stream: ActivityStream }[] {
  // Extract HR and track names from raw XML before any cleaning
  const allHR = extractAllHR(xml)
  const trackNames = extractTrackNames(xml)

  // Strip <extensions>...</extensions> blocks so DOMParser never sees
  // invalid namespace prefixes (gpxpy emits <http://...:tag> which is illegal XML)
  const cleaned = xml.replace(/<extensions>[\s\S]*?<\/extensions>/g, '')

  const parser = new DOMParser()
  const doc = parser.parseFromString(cleaned, 'application/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('GPX non valido: ' + parseError.textContent?.slice(0, 100))

  const results: { activity: Activity; stream: ActivityStream }[] = []
  const tracks = doc.querySelectorAll('trk')

  tracks.forEach((trk, trackIdx) => {
    const name =
      trackNames[trackIdx] ||
      trk.querySelector('name')?.textContent?.trim() ||
      filename.replace(/\.gpx$/i, '') + (tracks.length > 1 ? ` #${trackIdx + 1}` : '')

    const trkptEls = trk.querySelectorAll('trkpt')
    const hrOffset = countTrkptsBefore(xml, trackIdx)
    const points: GpxPoint[] = []

    trkptEls.forEach((el, ptIdx) => {
      const lat = parseFloat(el.getAttribute('lat') ?? '0')
      const lon = parseFloat(el.getAttribute('lon') ?? '0')
      const eleEl = el.querySelector('ele')
      const timeEl = el.querySelector('time')
      points.push({
        lat,
        lon,
        ele: eleEl ? parseFloat(eleEl.textContent ?? '0') : undefined,
        time: timeEl?.textContent ? new Date(timeEl.textContent) : undefined,
        hr: allHR[hrOffset + ptIdx],
      })
    })

    if (points.length < 2) return

    try {
      results.push(buildActivityFromPoints(points, name, trackIdx))
    } catch {
      // skip bad tracks
    }
  })

  if (results.length === 0) throw new Error('Nessuna corsa trovata nel file GPX')
  return results
}
