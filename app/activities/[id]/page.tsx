'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Activity, ActivityStream } from '@/types'
import { getActivities, getStream, deleteActivity, saveActivities, getShoes } from '@/lib/storage'
import { ActivityChart } from '@/components/ActivityChart'
import { formatPace, formatDistance, formatDuration, formatDate } from '@/lib/utils'
import { getZoneLabel } from '@/lib/zone-utils'

const LeafletMap = dynamic(() => import('@/components/LeafletMap').then(m => m.LeafletMap), { ssr: false })

interface ChartPoint { dist: number; hr?: number; pace?: number; alt?: number }

const LABELS: { value: string; color: string }[] = [
  { value: 'Gara',        color: '#ef4444' },
  { value: 'Fondo lento', color: '#22c55e' },
  { value: 'Interval',    color: '#a855f7' },
  { value: 'Recupero',    color: '#6b7280' },
  { value: 'Long run',    color: '#f97316' },
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
    { label: 'Distanza',   value: formatDistance(activity.distance) },
    { label: 'Durata',     value: formatDuration(activity.duration) },
    { label: 'Passo medio', value: activity.avgPace ? formatPace(activity.avgPace) + '/km' : '—', color: zone.color },
    { label: 'FC media',   value: activity.avgHeartRate ? Math.round(activity.avgHeartRate) + ' bpm' : '—', color: '#ef4444' },
    { label: 'FC max',     value: activity.maxHeartRate ? Math.round(activity.maxHeartRate) + ' bpm' : '—', color: '#f87171' },
    { label: 'Dislivello', value: activity.elevationGain > 0 ? '+' + Math.round(activity.elevationGain) + ' m' : '—', color: '#16a34a' },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link href="/activities">
              Allenamenti
            </Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            <span className="text-truncate" style={{ maxWidth: '20rem', display: 'inline-block' }}>
              {activity.name}
            </span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <h1 className="h4 fw-bold mb-0">{activity.name}</h1>
            {activity.label ? (
              (() => {
                const ldef = LABELS.find((l) => l.value === activity.label)
                return ldef ? (
                  <span
                    className="badge rounded-pill fw-semibold"
                    style={{ backgroundColor: ldef.color + '22', color: ldef.color, border: `1px solid ${ldef.color}55` }}
                  >
                    {ldef.value}
                  </span>
                ) : null
              })()
            ) : (
              <span
                className="badge rounded-pill fw-semibold"
                style={{ backgroundColor: zone.color + '22', color: zone.color, border: `1px solid ${zone.color}55` }}
              >
                {zone.label}
              </span>
            )}
          </div>
          <p className="text-muted small mb-0">
            {formatDate(activity.date)}{activity.shoe ? ` · ${activity.shoe}` : ''}
          </p>
        </div>
        <div className="flex-shrink-0">
          {confirmDelete ? (
            <div className="d-flex align-items-center gap-2">
              <button
                onClick={() => { deleteActivity(id); router.push('/activities') }}
                className="btn btn-danger btn-sm"
              >
                Conferma
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-link btn-sm text-muted p-0">
                Annulla
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn btn-outline-danger btn-sm">
              Elimina
            </button>
          )}
        </div>
      </div>

      {/* Label selector */}
      <div className="card border mb-3">
        <div className="card-body py-3">
          <p className="text-uppercase text-muted small fw-semibold mb-2" style={{ letterSpacing: '0.05em' }}>
            Etichetta
          </p>
          <div className="d-flex flex-wrap gap-2">
            {LABELS.map((l) => {
              const active = activity.label === l.value
              return (
                <button
                  key={l.value}
                  onClick={() => setLabel(l.value)}
                  className={`btn btn-sm rounded-pill ${active ? 'btn-brand' : 'btn-outline-secondary'}`}
                  style={active ? { backgroundColor: l.color, borderColor: l.color, color: '#fff' } : undefined}
                >
                  {l.value}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Shoe selector */}
      <div className="card border mb-3">
        <div className="card-body py-3">
          <p className="text-uppercase text-muted small fw-semibold mb-2" style={{ letterSpacing: '0.05em' }}>
            Scarpe
          </p>
          {availableShoes.length === 0 ? (
            <p className="text-muted small mb-0">Nessuna scarpa registrata</p>
          ) : availableShoes.length <= 5 ? (
            <div className="d-flex flex-wrap gap-2">
              {availableShoes.map((shoe) => {
                const active = activity.shoe === shoe
                return (
                  <button
                    key={shoe}
                    onClick={() => setShoe(shoe)}
                    className={`btn btn-sm rounded-pill ${active ? 'btn-brand' : 'btn-outline-secondary'}`}
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
              className="form-select form-select-sm w-auto"
            >
              <option value="">-- Nessuna scarpa --</option>
              {availableShoes.map((shoe) => (
                <option key={shoe} value={shoe}>{shoe}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="row g-2 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="col-4 col-md-2">
            <div className="card border-0 bg-light text-center h-100">
              <div className="card-body p-2">
                <p className="text-uppercase text-muted mb-1" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  {s.label}
                </p>
                <p
                  className="fw-bold mb-0"
                  style={{ fontSize: '1.05rem', color: s.color ?? undefined }}
                >
                  {s.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* OSM Map */}
      {hasGps && (
        <div className="card mb-3">
          <div className="card-header d-flex align-items-center gap-2 py-2">
            <span className="fw-semibold small">Percorso</span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>OpenStreetMap</span>
          </div>
          <div className="card-body p-0" style={{ height: '350px', borderRadius: '0 0 0.375rem 0.375rem', overflow: 'hidden' }}>
            <LeafletMap points={stream!.latlng!} height={350} interactive />
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData.length > 0 && (hasHR || hasPace) && (
        <div className="card mb-3">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-1">FC e Passo</h2>
            <p className="text-muted small mb-3">
              {hasHR && activity.avgHeartRate && `Media FC: ${Math.round(activity.avgHeartRate)} bpm · `}
              {hasPace && activity.avgPace && `Passo medio: ${formatPace(activity.avgPace)}/km`}
            </p>
            <ActivityChart data={chartData} showHR={hasHR} showPace={hasPace} showAlt={false} />
          </div>
        </div>
      )}

      {chartData.length > 0 && hasAlt && (
        <div className="card mb-3">
          <div className="card-body">
            <h2 className="h6 fw-semibold mb-3">Altimetria</h2>
            <ActivityChart data={chartData} showHR={false} showPace={false} showAlt={true} />
          </div>
        </div>
      )}

      {!hasGps && chartData.length === 0 && (
        <div className="text-center text-muted small p-5 border border-dashed rounded">
          Nessun dato GPS o stream per questa attività
        </div>
      )}
    </div>
  )
}
