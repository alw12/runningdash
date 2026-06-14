'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from '@/types'
import { getActivities, deleteActivities } from '@/lib/storage'
import { formatPace, formatDistance, formatDuration, formatDate } from '@/lib/utils'
import { getZoneLabel, isWalkZone } from '@/lib/zone-utils'

type SortKey = 'date' | 'distance' | 'pace' | 'hr'

// Hex colors for activity labels (matches LABEL_STYLES keys in labels.ts)
const LABEL_HEX: Record<string, string> = {
  'Gara':        '#ef4444',
  'Fondo lento': '#22c55e',
  'Interval':    '#a855f7',
  'Recupero':    '#6b7280',
  'Long run':    '#f97316',
}

function badgeStyle(hexColor: string): React.CSSProperties {
  return {
    backgroundColor: hexColor + '22',
    color: hexColor,
    border: `1px solid ${hexColor}44`,
  }
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [sort, setSort] = useState<SortKey>('date')
  const [typeFilter, setTypeFilter] = useState<'all' | 'run' | 'walk'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)

  useEffect(() => { setActivities(getActivities()) }, [])

  const visible = activities.filter(a => {
    if (typeFilter === 'run') return !isWalkZone(a.avgPace)
    if (typeFilter === 'walk') return isWalkZone(a.avgPace)
    return true
  })

  const sorted = [...visible].sort((a, b) => {
    switch (sort) {
      case 'date':     return new Date(b.date).getTime() - new Date(a.date).getTime()
      case 'distance': return b.distance - a.distance
      case 'pace':     return (a.avgPace ?? 9999) - (b.avgPace ?? 9999)
      case 'hr':       return (b.avgHeartRate ?? 0) - (a.avgHeartRate ?? 0)
    }
  })

  const allSelected = sorted.length > 0 && sorted.every((a) => selected.has(a.id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map((a) => a.id)))
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function bulkDelete() {
    const ids = Array.from(selected)
    deleteActivities(ids)
    setActivities((prev) => prev.filter((a) => !selected.has(a.id)))
    setSelected(new Set())
    setConfirmBulk(false)
  }

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Data' },
    { key: 'distance', label: 'Distanza' },
    { key: 'pace', label: 'Passo' },
    { key: 'hr', label: 'FC' },
  ]

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h1 className="h4 fw-bold mb-0">Allenamenti</h1>
          <p className="text-muted small mb-0">{activities.length} corse totali</p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {selected.size > 0 && (
            confirmBulk ? (
              <>
                <span className="small text-muted">Eliminare {selected.size} corse?</span>
                <button onClick={bulkDelete} className="btn btn-sm btn-danger">
                  Conferma
                </button>
                <button onClick={() => setConfirmBulk(false)} className="btn btn-sm btn-outline-secondary">
                  Annulla
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmBulk(true)}
                className="btn btn-sm btn-outline-danger"
              >
                🗑 Elimina {selected.size} selezionate
              </button>
            )
          )}
        </div>
      </div>

      {/* Type filter */}
      <div className="d-flex flex-wrap gap-2">
        <div className="btn-group" role="group" aria-label="Filtro tipo attività">
          {([['all', 'Tutti'], ['run', 'Corse'], ['walk', 'Passeggiate']] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTypeFilter(k)}
              className={`btn btn-sm ${typeFilter === k ? 'btn-dark' : 'btn-outline-secondary'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Sort buttons */}
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <span className="text-uppercase text-muted small fw-medium" style={{ letterSpacing: '0.05em' }}>Ordina:</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`btn btn-sm ${sort === s.key ? 'btn-dark' : 'btn-outline-secondary'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activities.length === 0 ? (
        <div className="card text-center py-5">
          <div className="card-body">
            <p className="fs-1 mb-2">🏃</p>
            <p className="text-muted small mb-0">
              Nessun allenamento.{' '}
              <Link href="/" className="text-warning text-decoration-none">Importa dati →</Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover table-sm align-middle mb-0">
            <thead className="table-light">
              <tr className="text-uppercase text-muted small" style={{ letterSpacing: '0.05em' }}>
                <th className="ps-3" style={{ width: '2rem' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="form-check-input"
                  />
                </th>
                <th>Nome</th>
                <th>Data</th>
                <th className="text-end">Dist</th>
                <th className="text-end">Durata</th>
                <th className="text-end">Passo</th>
                <th className="text-end">FC med</th>
                <th className="text-end">FC max</th>
                <th className="text-end">↑ m</th>
                <th>Scarpe</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => {
                const zone = getZoneLabel(a.avgPace)
                return (
                  <tr
                    key={a.id}
                    className={selected.has(a.id) ? 'table-warning' : ''}
                  >
                    <td className="ps-3">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggle(a.id)}
                        className="form-check-input"
                      />
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <Link href={`/activities/${a.id}`} className="fw-medium text-dark text-decoration-none link-warning">
                          {a.name}
                        </Link>
                        {a.label && LABEL_HEX[a.label] ? (
                          <span
                            className="badge badge-label"
                            style={badgeStyle(LABEL_HEX[a.label])}
                          >
                            {a.label}
                          </span>
                        ) : (
                          <span
                            className="badge badge-label"
                            style={badgeStyle(zone.color)}
                          >
                            {zone.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted">{formatDate(a.date)}</td>
                    <td className="text-end fw-semibold">{formatDistance(a.distance)}</td>
                    <td className="text-end text-muted">{formatDuration(a.duration)}</td>
                    <td className="text-end fw-semibold" style={{ color: zone.color }}>
                      {a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}
                    </td>
                    <td className="text-end fw-semibold text-danger">
                      {a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}
                    </td>
                    <td className="text-end text-muted">
                      {a.maxHeartRate ? Math.round(a.maxHeartRate) + ' bpm' : '—'}
                    </td>
                    <td className="text-end text-muted">
                      {a.elevationGain > 0 ? '+' + Math.round(a.elevationGain) : '—'}
                    </td>
                    <td className="text-muted small">{a.shoe ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
