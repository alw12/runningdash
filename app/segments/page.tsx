'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Activity, ActivityStream } from '@/types'
import { getActivities, getStream } from '@/lib/storage'
import { clusterByStartZone, parseLocalLegendCSV, RouteCluster, LocalLegendSegment } from '@/lib/segments'
import { RouteMap } from '@/components/RouteMap'
import { formatDistance, formatDate, activityLabel, isWalk } from '@/lib/utils'

const LeafletMap = dynamic(() => import('@/components/LeafletMap').then(m => m.LeafletMap), { ssr: false })

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

  const expandedCluster = clusters.find(c => c.id === expanded)
  const expandedRuns = expandedCluster?.runs ?? []
  // Merge all latlng points from cluster runs for combined map
  const allPoints: [number, number][] = expandedRuns
    .flatMap(a => streamMap[a.id]?.latlng ?? [])
    .filter((_, i) => i % 3 === 0) // downsample

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Segmenti</h1>
          <p className="text-gray-500 text-sm mt-0.5">Zone abituali rilevate automaticamente · {clusters.length} zone</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
        >
          + local_legend_segments.csv
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => handleLegendFile(e.target.files?.[0] ?? null)} />
      </div>

      {/* Local Legend */}
      {legends.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-5">
          <h2 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2 text-sm">
            🏆 Local Legend
          </h2>
          <div className="space-y-2">
            {legends.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-white/70 rounded-xl px-4 py-2.5 border border-yellow-100">
                <span className="font-semibold text-gray-900 text-sm">{l.name}</span>
                <span className="text-xs text-gray-400 font-mono">#{l.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {clusters.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-gray-700 font-medium mb-1">Nessun dato GPS</p>
          <p className="text-gray-400 text-sm">
            Importa <code className="bg-gray-100 px-1.5 py-0.5 rounded">All_Runs.gpx</code> per rilevare zone abituali
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clusters.map((c) => {
            const isOpen = expanded === c.id
            const sample = c.runs[0]
            const sampleStream = sample ? streamMap[sample.id] : null
            const runsOnly = c.runs.filter(a => !isWalk(a.avgPace)).length
            const walksOnly = c.runs.length - runsOnly

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  <div className="shrink-0 rounded-lg overflow-hidden border border-gray-100">
                    <RouteMap
                      points={sampleStream?.latlng ?? []}
                      width={80}
                      height={60}
                      strokeWidth={1.5}
                      strokeColor={runsOnly > walksOnly ? '#f97316' : '#8b5cf6'}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{c.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {runsOnly > 0 && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">{runsOnly} corse</span>
                      )}
                      {walksOnly > 0 && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">{walksOnly} passeggiate</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistance(c.totalDistance)} totali · media {formatDistance(c.totalDistance / c.runs.length)} ·
                      ultima {formatDate(c.lastRun)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-orange-500">{c.runs.length}</p>
                    <p className="text-xs text-gray-400">attività</p>
                  </div>

                  <span className="text-gray-300 text-sm">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100">
                    {/* OSM map showing all runs in cluster */}
                    {allPoints.length > 1 && (
                      <LeafletMap points={allPoints} height={260} interactive />
                    )}
                    <div className="divide-y divide-gray-50">
                      {expandedRuns.map((a) => (
                        <Link
                          key={a.id}
                          href={`/activities/${a.id}`}
                          className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">{a.name}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                isWalk(a.avgPace) ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
                              }`}>
                                {activityLabel(a.avgPace)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{formatDate(a.date)}</p>
                          </div>
                          <div className="flex gap-4 text-sm text-right">
                            <span className="font-semibold text-gray-800">{formatDistance(a.distance)}</span>
                            {a.avgHeartRate && (
                              <span className="text-red-500">{Math.round(a.avgHeartRate)} bpm</span>
                            )}
                          </div>
                        </Link>
                      ))}
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
