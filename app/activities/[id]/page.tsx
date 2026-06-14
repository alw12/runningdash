'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Activity, ActivityStream } from '@/types'
import { getActivities, getStream, deleteActivity, saveActivities, getShoes } from '@/lib/storage'
import { ActivityChart } from '@/components/ActivityChart'
import { formatPace, formatDistance, formatDuration, formatDate } from '@/lib/utils'
import { getZoneLabel } from '@/lib/zone-utils'

const LeafletMap = dynamic(() => import('@/components/LeafletMap').then(m => m.LeafletMap), { ssr: false })

interface ChartPoint { dist: number; hr?: number; pace?: number; alt?: number }

const LABELS: { value: string; color: string; bg: string; text: string }[] = [
  { value: 'Gara',       color: '#ef4444', bg: 'bg-red-100',    text: 'text-red-600' },
  { value: 'Fondo lento', color: '#22c55e', bg: 'bg-green-100',  text: 'text-green-700' },
  { value: 'Interval',   color: '#a855f7', bg: 'bg-purple-100', text: 'text-purple-700' },
  { value: 'Recupero',   color: '#6b7280', bg: 'bg-gray-100',   text: 'text-gray-600' },
  { value: 'Long run',   color: '#f97316', bg: 'bg-orange-100', text: 'text-orange-600' },
]

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
  const [availableShoes, setAvailableShoes] = useState<string[]>([])

  useEffect(() => {
    const found = getActivities().find((a) => a.id === id)
    if (!found) { router.push('/activities'); return }
    setActivity(found)
    setStream(getStream(id))

    // Build shoe list: prefer structured Shoe records, fallback to unique strings from activities
    const structuredShoes = getShoes()
    if (structuredShoes.length > 0) {
      setAvailableShoes(structuredShoes.map((s) => s.displayName))
    } else {
      const fromActivities = Array.from(
        new Set(getActivities().map((a) => a.shoe).filter((s): s is string => Boolean(s)))
      )
      setAvailableShoes(fromActivities)
    }
  }, [id, router])

  function setLabel(value: string) {
    if (!activity) return
    const newLabel = activity.label === value ? undefined : value
    const all = getActivities()
    const updated = all.map((a) => a.id === id ? { ...a, label: newLabel } : a)
    saveActivities(updated)
    setActivity((prev) => prev ? { ...prev, label: newLabel } : prev)
  }

  function setShoe(value: string | undefined) {
    if (!activity) return
    // Toggle: clicking the current shoe removes it
    const newShoe = activity.shoe === value ? undefined : value
    const all = getActivities()
    saveActivities(all.map((a) => a.id === id ? { ...a, shoe: newShoe } : a))
    setActivity((prev) => prev ? { ...prev, shoe: newShoe } : prev)
  }

  if (!activity) return null

  const chartData = stream ? buildChartData(stream) : []
  const hasHR = chartData.some((p) => p.hr !== undefined)
  const hasPace = chartData.some((p) => p.pace !== undefined)
  const hasAlt = chartData.some((p) => p.alt !== undefined)
  const hasGps = (stream?.latlng?.length ?? 0) > 1
  const zone = getZoneLabel(activity.avgPace)

  const stats = [
    { label: 'Distanza', value: formatDistance(activity.distance), color: 'text-gray-900' },
    { label: 'Durata', value: formatDuration(activity.duration), color: 'text-gray-900' },
    { label: 'Passo medio', value: activity.avgPace ? formatPace(activity.avgPace) + '/km' : '—', color: zone.text },
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{activity.name}</h1>
            {activity.label ? (
              (() => {
                const ldef = LABELS.find((l) => l.value === activity.label)
                return ldef ? (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ldef.bg} ${ldef.text}`}>
                    {ldef.value}
                  </span>
                ) : null
              })()
            ) : (
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${zone.bg} ${zone.text}`}>
                {zone.label}
              </span>
            )}
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

      {/* Label selector */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Etichetta</p>
        <div className="flex flex-wrap gap-2">
          {LABELS.map((l) => {
            const active = activity.label === l.value
            return (
              <button
                key={l.value}
                onClick={() => setLabel(l.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  active
                    ? `${l.bg} ${l.text} border-transparent shadow-sm`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700'
                }`}
              >
                {l.value}
              </button>
            )
          })}
        </div>
      </div>

      {/* Shoe selector */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Scarpe</p>
        {availableShoes.length === 0 ? (
          <p className="text-sm text-gray-400">Nessuna scarpa registrata</p>
        ) : availableShoes.length <= 5 ? (
          <div className="flex flex-wrap gap-2">
            {availableShoes.map((shoe) => {
              const active = activity.shoe === shoe
              return (
                <button
                  key={shoe}
                  onClick={() => setShoe(shoe)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    active
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {shoe}
                </button>
              )
            })}
          </div>
        ) : (
          <select
            value={activity.shoe ?? ''}
            onChange={(e) => setShoe(e.target.value || undefined)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
          >
            <option value="">-- Nessuna scarpa --</option>
            {availableShoes.map((shoe) => (
              <option key={shoe} value={shoe}>{shoe}</option>
            ))}
          </select>
        )}
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
