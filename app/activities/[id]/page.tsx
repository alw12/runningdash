'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Activity, ActivityStream } from '@/types'
import { getActivities, getStream, deleteActivity } from '@/lib/storage'
import { ActivityChart } from '@/components/ActivityChart'
import { formatPace, formatDistance, formatDuration, formatDate } from '@/lib/utils'

interface ChartPoint { dist: number; hr?: number; pace?: number; alt?: number }

function buildChartData(stream: ActivityStream): ChartPoint[] {
  return stream.distance
    .map((dist, i) => {
      const vel = stream.velocity?.[i]
      return {
        dist: Math.round(dist),
        hr: stream.heartrate?.[i],
        pace: vel && vel > 0 ? 1000 / vel : undefined,
        alt: stream.altitude?.[i],
      }
    })
    .filter((_, i) => i % 5 === 0)
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [stream, setStream] = useState<ActivityStream | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const found = getActivities().find((a) => a.id === id)
    if (!found) { router.push('/activities'); return }
    setActivity(found)
    setStream(getStream(id))
  }, [id, router])

  if (!activity) return null

  const chartData = stream ? buildChartData(stream) : []
  const hasHR = chartData.some((p) => p.hr !== undefined)
  const hasPace = chartData.some((p) => p.pace !== undefined)
  const hasAlt = chartData.some((p) => p.alt !== undefined)

  const stats = [
    { label: 'Distanza', value: formatDistance(activity.distance), color: 'text-gray-900' },
    { label: 'Durata', value: formatDuration(activity.duration), color: 'text-gray-900' },
    { label: 'Passo medio', value: activity.avgPace ? formatPace(activity.avgPace) + '/km' : '—', color: 'text-blue-600' },
    { label: 'FC media', value: activity.avgHeartRate ? Math.round(activity.avgHeartRate) + ' bpm' : '—', color: 'text-red-500' },
    { label: 'FC max', value: activity.maxHeartRate ? Math.round(activity.maxHeartRate) + ' bpm' : '—', color: 'text-red-400' },
    { label: 'Dislivello', value: activity.elevationGain > 0 ? '+' + Math.round(activity.elevationGain) + ' m' : '—', color: 'text-green-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-xs text-gray-400 hover:text-gray-600 mb-2 flex items-center gap-1">
            ← Indietro
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{activity.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {formatDate(activity.date)}{activity.shoe ? ` · ${activity.shoe}` : ''}
          </p>
        </div>
        <div>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { deleteActivity(id); router.push('/activities') }}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg"
              >
                Conferma eliminazione
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-400 hover:text-gray-600">
                Annulla
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
              Elimina
            </button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {chartData.length > 0 && (hasHR || hasPace) && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-4">FC e Passo</h2>
          <ActivityChart data={chartData} showHR={hasHR} showPace={hasPace} showAlt={false} />
        </div>
      )}

      {chartData.length > 0 && hasAlt && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-4">Altimetria</h2>
          <ActivityChart data={chartData} showHR={false} showPace={false} showAlt={true} />
        </div>
      )}

      {chartData.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm border border-gray-200">
          Nessun dato stream — importa il file GPX di questa corsa per vedere i grafici
        </div>
      )}
    </div>
  )
}
