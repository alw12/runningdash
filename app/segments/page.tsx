'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Activity, ActivityStream } from '@/types'
import { getActivities, getStream } from '@/lib/storage'
import { clusterByStartZone, parseLocalLegendCSV, RouteCluster, LocalLegendSegment } from '@/lib/segments'
import { RouteMap } from '@/components/RouteMap'
import { formatDistance, formatDate } from '@/lib/utils'

export default function SegmentsPage() {
  const [clusters, setClusters] = useState<RouteCluster[]>([])
  const [legends, setLegends] = useState<LocalLegendSegment[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const acts = getActivities()
    const streamMap: Record<string, ActivityStream | null> = {}
    acts.forEach((a) => { streamMap[a.id] = getStream(a.id) })
    setClusters(clusterByStartZone(acts, streamMap))
  }, [])

  async function handleLegendFile(file: File | null) {
    if (!file) return
    const text = await file.text()
    setLegends(parseLocalLegendCSV(text))
  }

  const streamMap: Record<string, ActivityStream | null> = {}
  if (typeof window !== 'undefined') {
    getActivities().forEach((a) => { streamMap[a.id] = getStream(a.id) })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Segmenti</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Percorsi abituali rilevati automaticamente
          </p>
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

      {/* Local legend */}
      {legends.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
          <h2 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
            <span>🏆</span> Local Legend
          </h2>
          <div className="space-y-2">
            {legends.map((l) => (
              <div key={l.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-yellow-100">
                <span className="font-medium text-gray-900">{l.name}</span>
                <span className="text-xs text-gray-400">ID {l.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-detected zones */}
      {clusters.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-gray-700 font-medium mb-1">Nessun dato GPS</p>
          <p className="text-gray-400 text-sm">
            Importa <code className="bg-gray-100 px-1 rounded">All_Runs.gpx</code> per rilevare i percorsi abituali
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-700">Percorsi abituali ({clusters.length} zone)</h2>
          {clusters.map((c) => {
            const sample = c.runs[0]
            const sampleStream = sample ? getStream(sample.id) : null
            const isOpen = expanded === c.id

            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <button
                  className="w-full flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                >
                  {/* Mini map */}
                  <div className="shrink-0">
                    <RouteMap
                      points={sampleStream?.latlng ?? []}
                      width={80}
                      height={60}
                      strokeWidth={1.5}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{c.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.runs.length} corse · {formatDistance(c.totalDistance)} totali ·{' '}
                      {formatDistance(c.totalDistance / c.runs.length)} media
                    </p>
                    <p className="text-xs text-gray-400">
                      Prima: {formatDate(c.firstRun)} · Ultima: {formatDate(c.lastRun)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-orange-500">{c.runs.length}</p>
                    <p className="text-xs text-gray-400">corse</p>
                  </div>

                  <span className="text-gray-400 text-sm ml-2">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Expanded run list */}
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {c.runs.map((a) => (
                      <Link
                        key={a.id}
                        href={`/activities/${a.id}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.name}</p>
                          <p className="text-xs text-gray-400">{formatDate(a.date)}</p>
                        </div>
                        <div className="flex gap-4 text-sm text-right">
                          <span className="font-semibold">{formatDistance(a.distance)}</span>
                          {a.avgHeartRate && (
                            <span className="text-red-500">{Math.round(a.avgHeartRate)} bpm</span>
                          )}
                        </div>
                      </Link>
                    ))}
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
