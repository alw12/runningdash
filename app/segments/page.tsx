'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Activity, ActivityStream } from '@/types'
import { getActivities, getStream } from '@/lib/storage'
import { clusterByStartZone, parseLocalLegendCSV, RouteCluster, LocalLegendSegment } from '@/lib/segments'
import { RouteMap } from '@/components/RouteMap'
import { formatDistance, formatDate, formatPace, formatDuration } from '@/lib/utils'
import { getZoneLabel, isWalkZone } from '@/lib/zone-utils'

const LeafletMap = dynamic(() => import('@/components/LeafletMap').then(m => m.LeafletMap), { ssr: false })

// Compute trend comparing last 3 runs vs previous 3 runs by distance
// Returns 'up' | 'down' | 'neutral'
function computeTrend(runs: Activity[]): 'up' | 'down' | 'neutral' {
  // runs are in the order they were pushed (oldest first typically),
  // sort by date descending so index 0 = most recent
  const sorted = [...runs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recent = sorted.slice(0, 3)
  const previous = sorted.slice(3, 6)
  if (recent.length < 2 || previous.length < 1) return 'neutral'

  const avgRecent = recent.reduce((s, a) => s + a.distance, 0) / recent.length
  const avgPrev = previous.reduce((s, a) => s + a.distance, 0) / previous.length

  const delta = (avgRecent - avgPrev) / avgPrev
  if (delta > 0.03) return 'up'
  if (delta < -0.03) return 'down'
  return 'neutral'
}

// Compute trend by pace: lower pace = faster = improvement
function computePaceTrend(runs: Activity[]): 'up' | 'down' | 'neutral' {
  const withPace = runs.filter(a => a.avgPace && !isWalkZone(a.avgPace))
  if (withPace.length < 4) return 'neutral'

  const sorted = [...withPace].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recent = sorted.slice(0, 3)
  const previous = sorted.slice(3, 6)
  if (recent.length < 2 || previous.length < 1) return 'neutral'

  const avgRecent = recent.reduce((s, a) => s + (a.avgPace ?? 0), 0) / recent.length
  const avgPrev = previous.reduce((s, a) => s + (a.avgPace ?? 0), 0) / previous.length

  const delta = (avgPrev - avgRecent) / avgPrev // positive = got faster
  if (delta > 0.02) return 'up'
  if (delta < -0.02) return 'down'
  return 'neutral'
}

function TrendArrow({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') return <span className="fw-bold text-success" title="Miglioramento nelle ultime 3 corse">&#8593;</span>
  if (trend === 'down') return <span className="fw-bold text-danger" title="Peggioramento nelle ultime 3 corse">&#8595;</span>
  return <span className="fw-bold text-secondary" title="Andamento stabile">&ndash;</span>
}

export default function SegmentsPage() {
  const [clusters, setClusters] = useState<RouteCluster[]>([])
  const [legends, setLegends] = useState<LocalLegendSegment[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [streamMap, setStreamMap] = useState<Record<string, ActivityStream | null>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const acts = getActivities()
    const sm: Record<string, ActivityStream | null> = {}
    acts.forEach((a) => { sm[a.id] = getStream(a.id) })
    setStreamMap(sm)
    setClusters(clusterByStartZone(acts, sm))
  }, [])

  async function handleLegendFile(file: File | null) {
    if (!file) return
    setLegends(parseLocalLegendCSV(await file.text()))
  }

  // Build a set of legend names for fast lookup
  const legendNames = new Set(legends.map(l => l.name.toLowerCase().trim()))

  function isLocalLegend(clusterLabel: string): boolean {
    const label = clusterLabel.toLowerCase().trim()
    return legends.some(l => label.includes(l.name.toLowerCase().trim()) || l.name.toLowerCase().trim().includes(label))
  }

  const expandedCluster = clusters.find(c => c.id === expanded)
  const expandedRuns = expandedCluster?.runs ?? []
  // Sort expanded runs by date descending
  const expandedRunsSorted = [...expandedRuns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Merge all latlng points from cluster runs for combined map
  const allPoints: [number, number][] = expandedRuns
    .flatMap(a => streamMap[a.id]?.latlng ?? [])
    .filter((_, i) => i % 3 === 0) // downsample

  return (
    <div className="d-flex flex-column gap-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h4 fw-bold mb-0">Segmenti</h1>
          <p className="text-muted small mb-0">
            Zone abituali rilevate automaticamente &middot; {clusters.length} zone
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="btn btn-sm btn-outline-secondary"
        >
          + local_legend_segments.csv
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="d-none"
          onChange={(e) => handleLegendFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Empty state */}
      {clusters.length === 0 ? (
        <div className="text-center py-5 text-muted border rounded-3">
          <p className="fs-1 mb-2">&#128205;</p>
          <p className="fw-semibold text-body mb-1">Nessun dato GPS</p>
          <p className="small mb-0">
            Importa <code>All_Runs.gpx</code> per rilevare zone abituali
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {clusters.map((c) => {
            const isOpen = expanded === c.id
            const sample = c.runs[0]
            const sampleStream = sample ? streamMap[sample.id] : null

            // Separate runs from walks
            const runsOnly = c.runs.filter(a => !isWalkZone(a.avgPace))
            const walksOnly = c.runs.filter(a => isWalkZone(a.avgPace))
            const runsCount = runsOnly.length
            const walksCount = walksOnly.length
            const isPrimarilyRuns = runsCount >= walksCount

            // Average distance per activity (in meters)
            const avgDist = c.totalDistance / c.runs.length

            // Average pace across runs only (exclude walks)
            const pacedRuns = runsOnly.filter(a => a.avgPace)
            const avgPace = pacedRuns.length > 0
              ? pacedRuns.reduce((s, a) => s + (a.avgPace ?? 0), 0) / pacedRuns.length
              : null

            // Trend: prefer pace trend for clusters with enough paced runs, else distance trend
            const trend = pacedRuns.length >= 4 ? computePaceTrend(c.runs) : computeTrend(c.runs)

            // Local legend match
            const legend = isLocalLegend(c.label)

            // Map stroke color
            const strokeColor = isPrimarilyRuns ? '#f97316' : '#8b5cf6'

            return (
              <div
                key={c.id}
                className="card mb-3 shadow-sm overflow-hidden"
              >
                {/* Card header — clickable */}
                <button
                  className="btn btn-link text-decoration-none text-start w-100 p-0"
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  <div className="card-body d-flex align-items-start gap-3">
                    {/* Route thumbnail */}
                    <div className="flex-shrink-0 rounded overflow-hidden border">
                      <RouteMap
                        points={sampleStream?.latlng ?? []}
                        width={88}
                        height={66}
                        strokeWidth={1.8}
                        strokeColor={strokeColor}
                      />
                    </div>

                    {/* Main info */}
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      {/* Zone name + legend badge */}
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <p className="fw-bold text-body mb-0 text-truncate">
                          {c.label}
                        </p>
                        {legend && (
                          <span className="badge bg-warning text-dark ms-1">
                            &#127942; Local Legend
                          </span>
                        )}
                      </div>

                      {/* Activity type badges */}
                      <div className="d-flex align-items-center gap-2 mt-1">
                        {runsCount > 0 && (
                          <span className="badge rounded-pill" style={{ backgroundColor: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' }}>
                            {runsCount} {runsCount === 1 ? 'corsa' : 'corse'}
                          </span>
                        )}
                        {walksCount > 0 && (
                          <span className="badge rounded-pill" style={{ backgroundColor: '#f3e5f5', color: '#6a1b9a', border: '1px solid #ce93d8' }}>
                            {walksCount} {walksCount === 1 ? 'passeggiata' : 'passeggiate'}
                          </span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="d-flex align-items-center gap-4 mt-2 flex-wrap">
                        {/* Avg distance */}
                        <div className="d-flex flex-column">
                          <span className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Media km</span>
                          <span className="fw-semibold small text-body">{formatDistance(avgDist)}</span>
                        </div>

                        {/* Avg pace — runs only */}
                        {avgPace !== null && (
                          <div className="d-flex flex-column">
                            <span className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passo medio</span>
                            <span className="fw-semibold small text-body">{formatPace(avgPace)} /km</span>
                          </div>
                        )}

                        {/* Trend */}
                        <div className="d-flex flex-column">
                          <span className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trend</span>
                          <div className="d-flex align-items-center gap-1">
                            <TrendArrow trend={trend} />
                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>ultime 3</span>
                          </div>
                        </div>

                        {/* Last run */}
                        <div className="d-flex flex-column">
                          <span className="text-muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ultima</span>
                          <span className="fw-semibold small text-body">{formatDate(c.lastRun)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: activity count + chevron */}
                    <div className="flex-shrink-0 d-flex flex-column align-items-end gap-2">
                      <div className="text-end">
                        <p className="fw-bold fs-4 mb-0" style={{ color: '#f97316', lineHeight: 1 }}>{c.runs.length}</p>
                        <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>attività</p>
                      </div>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded section */}
                {isOpen && (
                  <div className="border-top">
                    {/* OSM map */}
                    {allPoints.length > 1 && (
                      <LeafletMap points={allPoints} height={260} interactive />
                    )}

                    {/* Run list */}
                    <div className="list-group list-group-flush border-top">
                      {/* Column headers */}
                      <div className="d-none d-sm-flex align-items-center px-3 py-2 bg-light text-muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span className="flex-grow-1">Corsa</span>
                        <div className="d-flex align-items-center gap-4 text-end">
                          <span style={{ width: '4rem' }}>Distanza</span>
                          <span style={{ width: '4rem' }}>Passo</span>
                          <span style={{ width: '4rem' }}>Durata</span>
                        </div>
                      </div>

                      {expandedRunsSorted.map((a) => {
                        const z = getZoneLabel(a.avgPace)
                        return (
                          <Link
                            key={a.id}
                            href={`/activities/${a.id}`}
                            className="list-group-item list-group-item-action d-flex align-items-center gap-3 px-3 py-2 text-decoration-none"
                          >
                            {/* Date + zone badge */}
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="d-flex align-items-center gap-2 mb-1">
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: z.color + '22',
                                    color: z.color,
                                    border: `1px solid ${z.color}44`,
                                    fontSize: '0.7rem',
                                  }}
                                >
                                  {z.label}
                                </span>
                              </div>
                              <p className="text-muted mb-0 small">{formatDate(a.date)}</p>
                              {/* Run name — truncated, only show if different from cluster label */}
                              {a.name.replace(/^Nike Run Club:\s*/i, '').trim() !== c.label && (
                                <p className="text-muted mb-0 text-truncate" style={{ fontSize: '0.72rem' }}>{a.name}</p>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="d-flex align-items-center gap-3 gap-sm-4 flex-shrink-0 text-end">
                              <div>
                                <p className="fw-semibold small text-body mb-0">
                                  {formatDistance(a.distance)}
                                </p>
                              </div>
                              <div className="d-none d-sm-block" style={{ width: '4rem' }}>
                                <p className="fw-semibold small text-body mb-0">
                                  {a.avgPace ? formatPace(a.avgPace) : '—'}
                                </p>
                                {a.avgPace && (
                                  <p className="text-muted mb-0" style={{ fontSize: '0.65rem' }}>/km</p>
                                )}
                              </div>
                              <div className="d-none d-sm-block" style={{ width: '4rem' }}>
                                <p className="fw-semibold small text-body mb-0">
                                  {a.duration ? formatDuration(a.duration) : '—'}
                                </p>
                              </div>
                              {/* Heart rate — show if present */}
                              {a.avgHeartRate && (
                                <div className="flex-shrink-0">
                                  <p className="fw-semibold small text-danger mb-0">{Math.round(a.avgHeartRate)}</p>
                                  <p className="text-muted mb-0" style={{ fontSize: '0.65rem' }}>bpm</p>
                                </div>
                              )}
                              {/* Arrow */}
                              <span className="text-muted">&rsaquo;</span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
