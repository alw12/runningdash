// Pace > 8:30/km → passeggiata
export const WALK_PACE_THRESHOLD = 510 // seconds per km

export function isWalk(avgPace?: number): boolean {
  return !!avgPace && avgPace > WALK_PACE_THRESHOLD
}

export function activityLabel(avgPace?: number): 'Corsa' | 'Passeggiata' {
  return isWalk(avgPace) ? 'Passeggiata' : 'Corsa'
}

export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || !isFinite(secondsPerKm)) return '—'
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) return (meters / 1000).toFixed(2) + ' km'
  return Math.round(meters) + ' m'
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateShort(isoString: string): string {
  return new Date(isoString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  })
}
