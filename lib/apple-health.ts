import JSZip from 'jszip'
import { Activity, ActivityStream } from '@/types'
import { parseGpxFile } from './gpx'

interface WorkoutRecord {
  startDate: string
  endDate: string
  duration: number        // minutes
  totalDistance?: number  // km
  avgHR?: number
  maxHR?: number
  minHR?: number
  routePath?: string
  name: string
}

function parseWorkouts(xml: string): WorkoutRecord[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const records: WorkoutRecord[] = []

  doc.querySelectorAll('Workout').forEach((w, i) => {
    const type = w.getAttribute('workoutActivityType') ?? ''
    if (!type.includes('Running')) return

    const startDate = w.getAttribute('startDate') ?? ''
    const endDate = w.getAttribute('endDate') ?? ''
    const duration = parseFloat(w.getAttribute('duration') ?? '0')

    let avgHR: number | undefined
    let maxHR: number | undefined
    let minHR: number | undefined
    let totalDistance: number | undefined

    w.querySelectorAll('WorkoutStatistics').forEach((stat) => {
      const t = stat.getAttribute('type') ?? ''
      if (t.includes('HeartRate')) {
        avgHR = parseFloat(stat.getAttribute('average') ?? '0') || undefined
        maxHR = parseFloat(stat.getAttribute('maximum') ?? '0') || undefined
        minHR = parseFloat(stat.getAttribute('minimum') ?? '0') || undefined
      }
      if (t.includes('DistanceWalkingRunning')) {
        const sum = parseFloat(stat.getAttribute('sum') ?? '0')
        if (sum > 0) totalDistance = sum
      }
    })

    let routePath: string | undefined
    const fileRef = w.querySelector('WorkoutRoute FileReference')
    if (fileRef) {
      routePath = fileRef.getAttribute('path') ?? undefined
    }

    const date = new Date(startDate)
    const name = `Corsa ${date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })} #${i + 1}`

    records.push({ startDate, endDate, duration, totalDistance, avgHR, maxHR, minHR, routePath, name })
  })

  return records
}

export async function parseAppleHealthZip(file: File): Promise<{
  activities: Activity[]
  streams: Record<string, ActivityStream>
}> {
  const zip = await JSZip.loadAsync(file)

  // Find export.xml
  const xmlEntry = zip.file(/export\.xml$/i)[0]
  if (!xmlEntry) throw new Error('export.xml non trovato nello ZIP')

  const xmlText = await xmlEntry.async('text')
  const workouts = parseWorkouts(xmlText)

  const activities: Activity[] = []
  const streams: Record<string, ActivityStream> = {}

  for (const w of workouts) {
    const startMs = new Date(w.startDate).getTime()
    const endMs = new Date(w.endDate).getTime()
    const duration = (endMs - startMs) / 1000

    let distance = (w.totalDistance ?? 0) * 1000  // km → meters
    let stream: ActivityStream | null = null
    let avgPace: number | undefined
    let elevGain = 0

    // Try to parse route GPX if available
    if (w.routePath) {
      const normalized = w.routePath.replace(/^\//, '')
      const gpxEntry =
        zip.file(normalized) ??
        zip.file('apple_health_export/' + normalized) ??
        zip.file(/workout-routes\/.*\.gpx$/i).find((f) =>
          f.name.includes(normalized.split('/').pop()?.replace('.gpx', '') ?? '')
        )

      if (gpxEntry) {
        try {
          const gpxText = await gpxEntry.async('text')
          const parsed = parseGpxFile(gpxText, gpxEntry.name)
          stream = parsed.stream
          if (parsed.activity.distance > 0) distance = parsed.activity.distance
          elevGain = parsed.activity.elevationGain
          avgPace = parsed.activity.avgPace
        } catch {
          // GPX parse failed, use XML data
        }
      }
    }

    if (!avgPace && distance > 0 && duration > 0) {
      const avgSpeed = distance / duration
      avgPace = avgSpeed > 0 ? 1000 / avgSpeed : undefined
    }

    const id = `ah-${startMs}`
    const activity: Activity = {
      id,
      name: w.name,
      date: w.startDate,
      distance,
      duration,
      elevationGain: elevGain,
      avgHeartRate: w.avgHR,
      maxHeartRate: w.maxHR,
      avgPace,
      type: 'Run',
      source: 'gpx',
    }

    activities.push(activity)
    if (stream) streams[id] = stream
  }

  return { activities, streams }
}
