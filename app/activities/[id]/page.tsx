'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Activity, ActivityStream } from '@/types'
import { getActivities, getStream, deleteActivity } from '@/lib/storage'
import { ActivityChart } from '@/components/ActivityChart'
import { formatPace, formatDistance, formatDuration, formatDate, activityLabel, isWalk } from '@/lib/utils'

const LeafletMap = dynamic(() => import('@/components/LeafletMap').then(m => m.LeafletMap), { ssr: false })

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
    .filter((_, i) => i % 4 === 0)
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
  const hasGps = (stream?.latlng?.length ?? 0) > 1
  const walk = isWalk(activity.avgPace)

  const stats = [
    { label: 'Distanza', value: formatDistance(activity.distance), color: 'text-gray-900' },
    { label: 'Durata', value: formatDuration(activity.duration), color: 'text-gray-900' },
    { label: 'Passo medio', value: activity.avgPace ? formatPace(activity.avgPace) + '/km' : '—', color: walk ? 'text-purple-600' : 'text-blue-600' },
    { label: 'FC media', value: activity.avgHeartRate ? Math.round(activity.avgHeartRate) + ' bpm' : '—', color: 'text-red-500' },
    { label: 'FC max', value: activity.maxHeartRate ? Math.round(activity.maxHeartRate) + ' bpm' : '—', color: 'text-red-400' },
    { label: 'Dislivello', value: activity.elevationGain > 0 ? '+' + Math.round(activity.elevationGain) + ' m' : '—', color: 'text-green-600' },
  ]

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400">
        <button onClick={() => router.push('/activities')} className="hover:text-gray-600 transition-colors">
          Allenamenti
        </button>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{activity.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{activity.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
              walk ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
            }`}>
              {activityLabel(activity.avgPace)}
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            {formatDate(activity.date)}{activity.shoe ? ` · ${activity.shoe}` : ''}
          </p>
        </div>
        <div className="shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { deleteActivity(id); router.push('/activities') }}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                Conferma
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
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

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide leading-none mb-2">{s.label}</p>
            <p className={`text-lg font-bold leading-none ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* OSM Map */}
      {hasGps && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">Percorso</span>
            <span className="text-xs text-gray-400">OpenStreetMap</span>
          </div>
          <LeafletMap points={stream!.latlng!} height={380} interactive />
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 && (hasHR || hasPace) && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-1">FC e Passo</h2>
          <p className="text-xs text-gray-400 mb-4">
            {hasHR && activity.avgHeartRate && `Media FC: ${Math.round(activity.avgHeartRate)} bpm · `}
            {hasPace && activity.avgPace && `Passo medio: ${formatPace(activity.avgPace)}/km`}
          </p>
          <ActivityChart data={chartData} showHR={hasHR} showPace={hasPace} showAlt={false} />
        </div>
      )}

      {chartData.length > 0 && hasAlt && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="font-semibold text-gray-800 mb-4">Altimetria</h2>
          <ActivityChart data={chartData} showHR={false} showPace={false} showAlt={true} />
        </div>
      )}

      {!hasGps && chartData.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm border border-dashed border-gray-200">
          Nessun dato GPS o stream per questa attività
        </div>
      )}
    </div>
  )
}
