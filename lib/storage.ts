'use client'
import { Activity, ActivityStream, Shoe } from '@/types'

const KEYS = {
  ACTIVITIES: 'rd_activities',
  STREAMS: 'rd_streams_',
  SHOES: 'rd_shoes',
}

export function saveActivities(activities: Activity[]) {
  localStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities))
}

export function getActivities(): Activity[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(KEYS.ACTIVITIES)
  return raw ? JSON.parse(raw) : []
}

export function deleteActivity(id: string) {
  saveActivities(getActivities().filter((a) => a.id !== id))
  localStorage.removeItem(KEYS.STREAMS + id)
}

export function deleteActivities(ids: string[]) {
  const set = new Set(ids)
  saveActivities(getActivities().filter((a) => !set.has(a.id)))
  ids.forEach((id) => localStorage.removeItem(KEYS.STREAMS + id))
}

export function saveStream(activityId: string, stream: ActivityStream) {
  localStorage.setItem(KEYS.STREAMS + activityId, JSON.stringify(stream))
}

export function getStream(activityId: string): ActivityStream | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(KEYS.STREAMS + activityId)
  return raw ? JSON.parse(raw) : null
}

export function saveShoes(shoes: Shoe[]) {
  localStorage.setItem(KEYS.SHOES, JSON.stringify(shoes))
}

export function getShoes(): Shoe[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(KEYS.SHOES)
  return raw ? JSON.parse(raw) : []
}

export function mergeActivities(existing: Activity[], incoming: Activity[]): Activity[] {
  const map = new Map(existing.map((a) => [a.id, a]))
  incoming.forEach((a) => map.set(a.id, a))
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}
