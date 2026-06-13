export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || !isFinite(secondsPerKm)) return '—'
  const mins = Math.floor(secondsPerKm / 60)
  const secs = Math.round(secondsPerKm % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2) + ' km'
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.round(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function msToSeconds(ms: number): number {
  return ms / 1000
}
