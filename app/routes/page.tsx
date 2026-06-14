'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, ActivityStream } from '@/types'
import { getActivities, getStream } from '@/lib/storage'
import { RouteMap } from '@/components/RouteMap'
import { formatDistance, formatDate, formatPace } from '@/lib/utils'
import { getZoneLabel, isWalkZone } from '@/lib/zone-utils'

interface RouteEntry {
  activity: Activity
  stream: ActivityStream | null
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteEntry[]>([])
  const [filter, setFilter] = useState<'all' | 'run' | 'walk'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const acts = getActivities()
    setRoutes(acts.map((a) => ({ activity: a, stream: getStream(a.id) })))
  }, [])

  const withGps = routes.filter((r) => (r.stream?.latlng?.length ?? 0) > 1)
  const withoutGps = routes.filter((r) => (r.stream?.latlng?.length ?? 0) <= 1)

  const filtered = withGps
    .filter((r) => {
      if (filter === 'run') return !isWalkZone(r.activity.avgPace)
      if (filter === 'walk') return isWalkZone(r.activity.avgPace)
      return true
    })
    .filter((r) => !search || r.activity.name.toLowerCase().includes(search.toLowerCase()))

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: `Tutti (${withGps.length})` },
    { key: 'run', label: `Corse (${withGps.filter(r => !isWalkZone(r.activity.avgPace)).length})` },
    { key: 'walk', label: `Passeggiate (${withGps.filter(r => isWalkZone(r.activity.avgPace)).length})` },
  ]

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header + search */}
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div>
          <h1 className="h4 fw-bold mb-0">Percorsi</h1>
          <p className="text-muted small mb-0">
            {withGps.length} con mappa GPS
            {withoutGps.length > 0 && ` · ${withoutGps.length} senza GPS`}
          </p>
        </div>
        <input
          type="text"
          placeholder="Cerca percorso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="form-control"
          style={{ maxWidth: '180px' }}
        />
      </div>

      {/* Filter tabs */}
      <div className="btn-group" role="group" aria-label="Filtro percorsi">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`btn btn-sm ${filter === f.key ? 'btn-dark' : 'btn-outline-secondary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {routes.length === 0 ? (
        <div className="card text-center py-5">
          <div className="card-body">
            <p className="fs-1 mb-2">🗺️</p>
            <p className="fw-medium mb-1">Nessun percorso</p>
            <p className="text-muted small mb-0">
              Importa file GPX dalla <Link href="/" className="text-warning text-decoration-none">dashboard</Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map(({ activity: a, stream }) => {
            const zone = getZoneLabel(a.avgPace)
            return (
              <div key={a.id} className="col-6 col-md-4 col-lg-3">
                <Link
                  href={`/activities/${a.id}`}
                  className="text-decoration-none d-block h-100"
                >
                  <div className="card h-100 shadow-sm route-card">
                    <div className="bg-light p-2">
                      <RouteMap
                        points={stream?.latlng ?? []}
                        width={320}
                        height={150}
                        strokeColor={zone.color}
                        className="w-100"
                      />
                    </div>
                    <div className="card-body py-2 px-3">
                      <div className="d-flex align-items-start justify-content-between gap-2 mb-1">
                        <p className="fw-semibold small text-dark mb-0 lh-sm route-card-name">
                          {a.name}
                        </p>
                        <span
                          className="badge fw-medium flex-shrink-0"
                          style={{ fontSize: '0.65rem', backgroundColor: 'transparent', border: '1px solid currentColor' }}
                        >
                          {zone.label}
                        </span>
                      </div>
                      <p className="small text-muted mb-1">{formatDate(a.date)}</p>
                      <div className="d-flex gap-2 small">
                        <span className="fw-bold text-dark">{formatDistance(a.distance)}</span>
                        {a.avgPace && (
                          <span className="fw-semibold" style={{ color: zone.color }}>
                            {formatPace(a.avgPace)}/km
                          </span>
                        )}
                        {a.avgHeartRate && (
                          <span className="text-danger">{Math.round(a.avgHeartRate)} bpm</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}

      {withoutGps.length > 0 && withGps.length > 0 && (
        <details className="card border">
          <summary className="card-header small fw-medium text-muted" style={{ cursor: 'pointer', userSelect: 'none' }}>
            Senza GPS ({withoutGps.length})
          </summary>
          <div className="list-group list-group-flush">
            {withoutGps.map(({ activity: a }) => {
              const zone = getZoneLabel(a.avgPace)
              return (
                <Link
                  key={a.id}
                  href={`/activities/${a.id}`}
                  className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3"
                >
                  <div>
                    <span className="small fw-medium text-dark">{a.name}</span>
                    <span
                      className="badge ms-2 fw-medium"
                      style={{ fontSize: '0.65rem', backgroundColor: 'transparent', border: '1px solid currentColor', color: zone.color }}
                    >
                      {zone.label}
                    </span>
                  </div>
                  <span className="small text-muted">{formatDate(a.date)} · {formatDistance(a.distance)}</span>
                </Link>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
