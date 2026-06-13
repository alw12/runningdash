'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Activity, ActivityStream, StravaTokens } from '@/types'
import { getActivities, getStream, saveStream, getTokens, saveTokens, isTokenExpired } from '@/lib/storage'
import { fetchStravaActivityStreams } from '@/lib/strava'
import { StatCard } from '@/components/StatCard'
import { ActivityChart } from '@/components/ActivityChart'
import { formatPace, formatDistance, formatDuration, formatDate } from '@/lib/utils'

interface ChartPoint {
  dist: number
  hr?: number
  pace?: number
  alt?: number
}

function buildChartData(stream: ActivityStream): ChartPoint[] {
  return stream.distance.map((dist, i) => {
    const vel = stream.velocity?.[i]
    const pace = vel && vel > 0 ? 1000 / vel : undefined
    return {
      dist: Math.round(dist),
      hr: stream.heartrate?.[i],
      pace,
      alt: stream.altitude?.[i],
    }
  }).filter((_, i) => i % 5 === 0) // downsample for perf
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [stream, setStream] = useState<ActivityStream | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const all = getActivities()
    const found = all.find((a) => a.id === id)
    if (!found) { router.push('/activities'); return }
    setActivity(found)

    const cached = getStream(id)
    if (cached) {
      setStream(cached)
      return
    }

    if (found.source === 'strava' && found.stravaId) {
      loadStravaStream(found.stravaId)
    }
  }, [id, router])

  async function loadStravaStream(stravaId: number) {
    const tokens = getTokens()
    if (!tokens) return
    setLoading(true)
    try {
      let valid: StravaTokens = tokens
      if (isTokenExpired(tokens)) {
        const res = await fetch('/api/strava', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refresh_token }),
        })
        if (!res.ok) return
        valid = await res.json()
        saveTokens(valid)
      }
      const s = await fetchStravaActivityStreams(valid.access_token, stravaId)
      saveStream(id, s)
      setStream(s)
    } finally {
      setLoading(false)
    }
  }

  if (!activity) return null

  const chartData = stream ? buildChartData(stream) : []
  const hasHR = chartData.some((p) => p.hr !== undefined)
  const hasPace = chartData.some((p) => p.pace !== undefined)
  const hasAlt = chartData.some((p) => p.alt !== undefined)

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3 flex items-center gap-1"
        >
          ← Indietro
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{activity.name}</h1>
        <p className="text-gray-400 text-sm mt-1">{formatDate(activity.date)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Distanza" value={formatDistance(activity.distance)} icon="📏" />
        <StatCard label="Durata" value={formatDuration(activity.duration)} icon="⏱️" />
        <StatCard
          label="Passo medio"
          value={activity.avgPace ? formatPace(activity.avgPace) + '/km' : '—'}
          icon="⚡"
        />
        <StatCard
          label="FC media"
          value={activity.avgHeartRate ? Math.round(activity.avgHeartRate) + ' bpm' : '—'}
          icon="❤️"
          sub={activity.maxHeartRate ? 'max ' + Math.round(activity.maxHeartRate) + ' bpm' : undefined}
        />
        <StatCard
          label="Dislivello"
          value={activity.elevationGain > 0 ? '+' + Math.round(activity.elevationGain) + ' m' : '—'}
          icon="⛰️"
        />
      </div>

      {loading && (
        <div className="text-center text-gray-400 text-sm py-4">Caricamento dati stream…</div>
      )}

      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">FC e Passo per distanza</h2>
          <ActivityChart
            data={chartData}
            showHR={hasHR}
            showPace={hasPace}
            showAlt={false}
          />
        </div>
      )}

      {chartData.length > 0 && hasAlt && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-4">Profilo altimetrico</h2>
          <ActivityChart data={chartData} showHR={false} showPace={false} showAlt={true} />
        </div>
      )}

      {chartData.length === 0 && !loading && activity.source === 'strava' && (
        <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400 text-sm">
          Dati stream non disponibili. Assicurati di essere connesso a Strava.
        </div>
      )}
    </div>
  )
}
