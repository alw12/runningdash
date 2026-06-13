'use client'
import { Activity, ActivityStream, Shoe } from '@/types'
import { getActivities, saveActivities, saveStream, saveShoes, getShoes } from './storage'

const SEEDED_KEY = 'rd_seeded_v1'

interface SeedData {
  activities: Activity[]
  shoes: Shoe[]
  legends: { id: string; name: string }[]
  streams: Record<string, ActivityStream>
}

export async function autoSeedIfEmpty() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(SEEDED_KEY)) return
  if (getActivities().length > 0) {
    localStorage.setItem(SEEDED_KEY, '1')
    return
  }

  try {
    const res = await fetch('/seed-data.json')
    if (!res.ok) return
    const data: SeedData = await res.json()

    saveActivities(data.activities ?? [])
    saveShoes(data.shoes ?? [])

    Object.entries(data.streams ?? {}).forEach(([id, stream]) => {
      saveStream(id, stream)
    })

    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // seed unavailable, no-op
  }
}
