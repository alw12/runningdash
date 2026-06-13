'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Activity, StravaTokens } from '@/types'
import {
  getActivities,
  getTokens,
  saveTokens,
  saveActivities,
  mergeActivities,
  isTokenExpired,
} from '@/lib/storage'
import { fetchStravaActivities } from '@/lib/strava'
import { StatCard } from '@/components/StatCard'
import { WeeklyChart } from '@/components/WeeklyChart'
import { GpxUpload } from '@/components/GpxUpload'
import { formatPace, formatDistance, formatDate } from '@/lib/utils'

export default function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [tokens, setTokens] = useState<StravaTokens | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setActivities(getActivities())
    setTokens(getTokens())
  }, [])

  const refreshToken = useCallback(async (tok: StravaTokens): Promise<StravaTokens> => {
    if (!isTokenExpired(tok)) return tok
    const res = await fetch('/api/strava', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tok.refresh_token }),
    })
    if (!res.ok) throw new Error('Token scaduto, riconnetti Strava')
    const valid: StravaTokens = await res.json()
    saveTokens(valid)
    setTokens(valid)
    return valid
  }, [])

  async function syncStrava() {
    if (!tokens) return
    setLoading(true)
    setError(null)
    try {
      const valid = await refreshToken(tokens)
      const fetched = await fetchStravaActivities(valid.access_token)
      const merged = mergeActivities(getActivities(), fetched)
      saveActivities(merged)
      setActivities(merged)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const recent = activities.slice(0, 30)
  const totalKm = recent.reduce((s, a) => s + a.distance, 0) / 1000
  const hrActivities = recent.filter((a) => a.avgHeartRate)
  const paceActivities = recent.filter((a) => a.avgPace)
  const avgPace = paceActivities.length
    ? paceActivities.reduce((s, a) => s + (a.avgPace ?? 0), 0) / paceActivities.length
    : 0
  const avgHR = hrActivities.length
    ? hrActivities.reduce((s, a) => s + (a.avgHeartRate ?? 0), 0) / hrActivities.length
    : 0

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          {tokens ? (
            <button
              onClick={syncStrava}
              disabled={loading}
              className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Sincronizzazione…' : '🔄 Sincronizza Strava'}
            </button>
          ) : (
            <a
              href="/api/auth/strava"
              className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              Connetti Strava
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {tokens && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700">
          <span>✓</span>
          <span>
            Connesso come{' '}
            <strong>
              {tokens.athlete?.firstname} {tokens.athlete?.lastname}
            </strong>
          </span>
        </div>
      )}

      {activities.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Allenamenti" value={String(recent.length)} icon="🏃" />
            <StatCard label="Distanza totale" value={totalKm.toFixed(0) + ' km'} icon="📏" />
            <StatCard label="Passo medio" value={avgPace > 0 ? formatPace(avgPace) + '/km' : '—'} icon="⚡" />
            <StatCard label="FC media" value={avgHR > 0 ? Math.round(avgHR) + ' bpm' : '—'} icon="❤️" />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Distanza settimanale</h2>
            <WeeklyChart activities={activities} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Ultimi allenamenti</h2>
              <Link href="/activities" className="text-sm text-blue-600 hover:underline">
                Tutti →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {activities.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href={`/activities/${a.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{a.name}</div>
                    <div className="text-sm text-gray-400">{formatDate(a.date)}</div>
                  </div>
                  <div className="flex gap-6 text-sm text-right">
                    <div>
                      <div className="font-semibold text-gray-800">{formatDistance(a.distance)}</div>
                      <div className="text-gray-400">distanza</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}
                      </div>
                      <div className="text-gray-400">passo</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}
                      </div>
                      <div className="text-gray-400">FC media</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <div className="text-4xl mb-3">🏃</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Nessun allenamento</h2>
            <p className="text-gray-500 text-sm mb-4">
              Connetti Strava o importa file GPX per iniziare
            </p>
          </div>
          <GpxUpload onImport={setActivities} />
        </div>
      )}

      {activities.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Importa GPX</h2>
          <GpxUpload onImport={setActivities} />
        </div>
      )}
    </div>
  )
}
