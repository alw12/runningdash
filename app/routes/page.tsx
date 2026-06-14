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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Percorsi</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {withGps.length} con mappa GPS
            {withoutGps.length > 0 && ` · ${withoutGps.length} senza GPS`}
          </p>
        </div>
        <input
          type="text"
          placeholder="Cerca…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 w-40 transition-colors"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-gray-700 font-medium mb-1">Nessun percorso</p>
          <p className="text-gray-400 text-sm">
            Importa file GPX dalla <Link href="/" className="text-orange-500 hover:underline">dashboard</Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(({ activity: a, stream }) => {
            const zone = getZoneLabel(a.avgPace)
            return (
              <Link
                key={a.id}
                href={`/activities/${a.id}`}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-orange-300 hover:shadow-md transition-all group"
              >
                <div className="bg-gray-50 p-3">
                  <RouteMap
                    points={stream?.latlng ?? []}
                    width={320}
                    height={150}
                    strokeColor={zone.color}
                    className="w-full"
                  />
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm group-hover:text-orange-500 transition-colors leading-tight">
                      {a.name}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${zone.bg} ${zone.text}`}>
                      {zone.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.date)}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <span className="font-bold text-gray-800">{formatDistance(a.distance)}</span>
                    {a.avgPace && (
                      <span className="font-semibold" style={{ color: zone.color }}>
                        {formatPace(a.avgPace)}/km
                      </span>
                    )}
                    {a.avgHeartRate && (
                      <span className="text-red-500">{Math.round(a.avgHeartRate)} bpm</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {withoutGps.length > 0 && withGps.length > 0 && (
        <details className="bg-gray-50 rounded-xl border border-gray-200">
          <summary className="px-5 py-3 text-sm font-medium text-gray-600 cursor-pointer select-none">
            Senza GPS ({withoutGps.length})
          </summary>
          <div className="border-t border-gray-200 divide-y divide-gray-100">
            {withoutGps.map(({ activity: a }) => {
              const zone = getZoneLabel(a.avgPace)
              return (
                <Link
                  key={a.id}
                  href={`/activities/${a.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <span className="text-sm text-gray-700 font-medium">{a.name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${zone.bg} ${zone.text}`}>
                      {zone.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(a.date)} · {formatDistance(a.distance)}</span>
                </Link>
              )
            })}
          </div>
        </details>
      )}
    </div>
  )
}
