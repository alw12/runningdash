import { getProfile } from './user-profile'
import { calculatePaceZones } from './pace-calc'

export interface ZoneLabel {
  label: string
  color: string   // hex
  bg: string      // tailwind bg class
  text: string    // tailwind text class
  ring: string    // tailwind ring/border class
  isWalk: boolean
}

// Fallback when no profile set
const WALK_FALLBACK = 510 // s/km (8:30/km)

// Zone thresholds computed lazily from profile
let _cachedVVO2maxPace: number | null = null

function vVO2maxPace(): number | null {
  if (_cachedVVO2maxPace !== null) return _cachedVVO2maxPace
  const p = getProfile()
  if (!p) return null
  const result = calculatePaceZones(p.heightCm, p.weightKg, p.gender)
  _cachedVVO2maxPace = result.vVO2maxPace
  return _cachedVVO2maxPace
}

// Call this after profile is saved to bust the cache
export function invalidateZoneCache() {
  _cachedVVO2maxPace = null
}

export function getZoneLabel(avgPace?: number): ZoneLabel {
  if (!avgPace) {
    return { label: 'Corsa', color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'border-orange-200', isWalk: false }
  }

  const vPace = vVO2maxPace()

  if (vPace === null) {
    // No profile — fallback to old binary logic
    const walk = avgPace > WALK_FALLBACK
    return walk
      ? { label: 'Passeggiata', color: '#8b5cf6', bg: 'bg-purple-100', text: 'text-purple-700', ring: 'border-purple-200', isWalk: true }
      : { label: 'Corsa', color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'border-orange-200', isWalk: false }
  }

  // Zone boundaries (pace s/km, higher = slower)
  // fraction of vVO2max → pace = vPace / fraction
  const Z = {
    vo2maxFast : vPace / 1.00, // = vPace
    vo2maxSlow : vPace / 0.95,
    tempoFast  : vPace / 0.88,
    tempoSlow  : vPace / 0.83,
    aeroFast   : vPace / 0.74,
    aeroSlow   : vPace / 0.65,
    recovFast  : vPace / 0.65, // = aeroSlow
    recovSlow  : vPace / 0.59,
  }

  if (avgPace <= Z.vo2maxFast) {
    return { label: 'Gara', color: '#dc2626', bg: 'bg-red-100', text: 'text-red-700', ring: 'border-red-200', isWalk: false }
  }
  if (avgPace <= Z.vo2maxSlow) {
    return { label: 'VO₂max', color: '#ef4444', bg: 'bg-red-100', text: 'text-red-600', ring: 'border-red-200', isWalk: false }
  }
  if (avgPace <= Z.tempoFast) {
    // 88-95% gap → call sub-threshold, show as VO2max color
    return { label: 'VO₂max', color: '#ef4444', bg: 'bg-red-100', text: 'text-red-600', ring: 'border-red-200', isWalk: false }
  }
  if (avgPace <= Z.tempoSlow) {
    return { label: 'Soglia', color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-700', ring: 'border-orange-200', isWalk: false }
  }
  if (avgPace <= Z.aeroFast) {
    // 74-83% gap → moderato
    return { label: 'Medio', color: '#eab308', bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'border-yellow-200', isWalk: false }
  }
  if (avgPace <= Z.aeroSlow) {
    return { label: 'Aerobico', color: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-700', ring: 'border-blue-200', isWalk: false }
  }
  if (avgPace <= Z.recovSlow) {
    return { label: 'Recupero', color: '#22c55e', bg: 'bg-green-100', text: 'text-green-700', ring: 'border-green-200', isWalk: false }
  }

  // Slower than recovery zone → walk
  return { label: 'Passeggiata', color: '#8b5cf6', bg: 'bg-purple-100', text: 'text-purple-700', ring: 'border-purple-200', isWalk: true }
}

export function isWalkZone(avgPace?: number): boolean {
  return getZoneLabel(avgPace).isWalk
}
