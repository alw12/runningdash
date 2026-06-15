const KEY = 'rd_profile'

export type AnchorMethod = 'anthropometric' | 'pace' | 'hr'

export interface UserProfile {
  // Base (sempre presenti)
  heightCm: number
  weightKg: number
  gender: 'm' | 'f'

  // Anchor method scelto dall'utente
  anchorMethod: AnchorMethod

  // Anchor: passo di riferimento (min/km come stringa "7:49" o secondi)
  referencePaceSeconds?: number   // passo medio reale su corse facili (s/km)

  // Anchor: frequenza cardiaca
  maxHR?: number                  // bpm FC massima misurata o stimata

  // Composizione corporea (opzionale)
  bodyFatPct?: number             // % massa grassa (0-60)
}

export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as UserProfile
    // Migrazione: profili vecchi senza anchorMethod
    if (!p.anchorMethod) p.anchorMethod = 'anthropometric'
    return p
  } catch {
    return null
  }
}

export function saveProfile(p: UserProfile): void {
  localStorage.setItem(KEY, JSON.stringify(p))
}
