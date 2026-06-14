const KEY = 'rd_profile'

export interface UserProfile {
  heightCm: number
  weightKg: number
  gender: 'm' | 'f'
}

export function getProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

export function saveProfile(p: UserProfile): void {
  localStorage.setItem(KEY, JSON.stringify(p))
}
