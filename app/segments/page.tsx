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
  if (trend === 'up') return <span className="text-emerald-500 font-bold text-base leading-none" title="Miglioramento nelle ultime 3 corse">↑</span>
  if (trend === 'down') return <span className="text-red-500 font-bold text-base leading-none" title="Peggioramento nelle ultime 3 corse">↓</span>
  return <span className="text-gray-400 font-bold text-sm leading-none" title="Andamento stabile">–</span>
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Segmenti</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Zone abituali rilevate automaticamente · {clusters.length} zone
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 transition-colors"
        >
          + local_legend_segments.csv
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleLegendFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Empty state */}
      {clusters.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Nessun dato GPS</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Importa <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">All_Runs.gpx</code> per rilevare zone abituali
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
                className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card header — clickable */}
                <button
                  className="w-full flex items-start gap-4 p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  {/* Route thumbnail */}
                  <div className="shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mt-0.5">
                    <RouteMap
                      points={sampleStream?.latlng ?? []}
                      width={88}
                      height={66}
                      strokeWidth={1.8}
                      strokeColor={strokeColor}
                    />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    {/* Zone name + legend badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight truncate">
                        {c.label}
                      </p>
                      {legend && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-700">
                          🏆 Local Legend
                        </span>
                      )}
                    </div>

                    {/* Activity type badges */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {runsCount > 0 && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full font-medium">
                          {runsCount} {runsCount === 1 ? 'corsa' : 'corse'}
                        </span>
                      )}
                      {walksCount > 0 && (
                        <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full font-medium">
                          {walksCount} {walksCount === 1 ? 'passeggiata' : 'passeggiate'}
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                      {/* Avg distance */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Media km</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDistance(avgDist)}</span>
                      </div>

                      {/* Avg pace — runs only */}
                      {avgPace !== null && (
                        <div className="flex flex-col">
                          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Passo medio</span>
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatPace(avgPace)} /km</span>
                        </div>
                      )}

                      {/* Trend */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Trend</span>
                        <div className="flex items-center gap-1">
                          <TrendArrow trend={trend} />
                          <span className="text-xs text-gray-400 dark:text-gray-500">ultime 3</span>
                        </div>
                      </div>

                      {/* Last run */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Ultima</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatDate(c.lastRun)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: activity count + chevron */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-orange-500 leading-none">{c.runs.length}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">attività</p>
                    </div>
                    <span className="text-gray-300 dark:text-gray-600 text-xs mt-1">
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* Expanded section */}
                {isOpen && (
                  <div className="border-t-2 border-gray-100 dark:border-gray-700">
                    {/* OSM map */}
                    {allPoints.length > 1 && (
                      <LeafletMap points={allPoints} height={260} interactive />
                    )}

                    {/* Run list */}
                    <div className="divide-y divide-gray-50 dark:divide-gray-800">
                      {/* Column headers */}
                      <div className="hidden sm:flex items-center px-5 py-2 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                        <span className="flex-1">Corsa</span>
                        <div className="flex items-center gap-6 text-right">
                          <span className="w-16">Distanza</span>
                          <span className="w-16">Passo</span>
                          <span className="w-16">Durata</span>
                        </div>
                      </div>

                      {expandedRunsSorted.map((a) => {
                        const z = getZoneLabel(a.avgPace)
                        return (
                          <Link
                            key={a.id}
                            href={`/activities/${a.id}`}
                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                          >
                            {/* Date + zone badge */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${z.bg} ${z.text}`}>
                                  {z.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(a.date)}</p>
                              {/* Run name — truncated, only show if different from cluster label */}
                              {a.name.replace(/^Nike Run Club:\s*/i, '').trim() !== c.label && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{a.name}</p>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                              <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {formatDistance(a.distance)}
                                </p>
                              </div>
                              <div className="w-16 hidden sm:block">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {a.avgPace ? formatPace(a.avgPace) : '—'}
                                </p>
                                {a.avgPace && (
                                  <p className="text-[10px] text-gray-400">/km</p>
                                )}
                              </div>
                              <div className="w-16 hidden sm:block">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                  {a.duration ? formatDuration(a.duration) : '—'}
                                </p>
                              </div>
                              {/* Heart rate — mobile only shows if present */}
                              {a.avgHeartRate && (
                                <div className="shrink-0">
                                  <p className="text-sm font-semibold text-red-500">{Math.round(a.avgHeartRate)}</p>
                                  <p className="text-[10px] text-gray-400">bpm</p>
                                </div>
                              )}
                              {/* Arrow */}
                              <span className="text-gray-300 dark:text-gray-600 text-sm group-hover:text-gray-500 transition-colors">›</span>
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
