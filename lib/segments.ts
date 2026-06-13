import { Activity, ActivityStream } from '@/types'

export interface RouteCluster {
  id: string
  label: string          // e.g. "Zona Ovest" or derived from most common run name
  centerLat: number
  centerLon: number
  runs: Activity[]
  totalDistance: number
  firstRun: string
  lastRun: string
}

// Haversine in meters
function distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Group runs by start location (within RADIUS meters)
const RADIUS = 300 // meters

export function clusterByStartZone(
  activities: Activity[],
  streams: Record<string, ActivityStream | null>
): RouteCluster[] {
  const withGps = activities.filter((a) => (streams[a.id]?.latlng?.length ?? 0) > 0)

  const clusters: RouteCluster[] = []

  for (const act of withGps) {
    const latlng = streams[act.id]?.latlng
    if (!latlng?.length) continue
    const [lat, lon] = latlng[0]

    const match = clusters.find(
      (c) => distM(c.centerLat, c.centerLon, lat, lon) < RADIUS
    )

    if (match) {
      match.runs.push(act)
      match.totalDistance += act.distance
      // Update center (moving average)
      match.centerLat = (match.centerLat * (match.runs.length - 1) + lat) / match.runs.length
      match.centerLon = (match.centerLon * (match.runs.length - 1) + lon) / match.runs.length
      if (act.date < match.firstRun) match.firstRun = act.date
      if (act.date > match.lastRun) match.lastRun = act.date
    } else {
      clusters.push({
        id: `cluster-${clusters.length}`,
        label: '',
        centerLat: lat,
        centerLon: lon,
        runs: [act],
        totalDistance: act.distance,
        firstRun: act.date,
        lastRun: act.date,
      })
    }
  }

  // Label each cluster by most frequent run name prefix
  for (const c of clusters) {
    const names = c.runs.map((r) => r.name.replace(/^Nike Run Club:\s*/i, '').trim())
    const freq = new Map<string, number>()
    names.forEach((n) => freq.set(n, (freq.get(n) ?? 0) + 1))
    const top = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0]
    c.label = top?.[0] ?? `Zona ${c.id}`
  }

  return clusters.sort((a, b) => b.runs.length - a.runs.length)
}

export interface LocalLegendSegment {
  id: string
  name: string
}

export function parseLocalLegendCSV(text: string): LocalLegendSegment[] {
  const lines = text.split('\n').filter((l) => l.trim())
  return lines.slice(1).map((l) => {
    const [id, ...rest] = l.split(',')
    return { id: id.trim(), name: rest.join(',').trim() }
  }).filter((s) => s.id && s.name)
}
