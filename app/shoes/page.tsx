'use client'
import { useEffect, useState } from 'react'
import { Activity, Shoe } from '@/types'
import { getActivities, getShoes } from '@/lib/storage'
import { formatDistance, formatDate } from '@/lib/utils'
import { StravaExportUpload } from '@/components/StravaExportUpload'

interface ShoeStats {
  shoe: Shoe | null
  name: string
  totalDistance: number
  runs: number
  lastUsed?: string
  avgPace?: number
}

export default function ShoesPage() {
  const [stats, setStats] = useState<ShoeStats[]>([])
  const [unassigned, setUnassigned] = useState(0)

  function compute() {
    const activities = getActivities()
    const shoes = getShoes()

    const map = new Map<string, ShoeStats>()

    for (const a of activities) {
      const key = a.shoe ?? '__none__'
      if (key === '__none__') { continue }

      if (!map.has(key)) {
        const shoe = shoes.find((s) => s.displayName === key) ?? null
        map.set(key, { shoe, name: key, totalDistance: 0, runs: 0, avgPace: 0 })
      }
      const s = map.get(key)!
      s.totalDistance += a.distance
      s.runs += 1
      if (!s.lastUsed || a.date > s.lastUsed) s.lastUsed = a.date
      if (a.avgPace) s.avgPace = (s.avgPace ?? 0) + a.avgPace
    }

    // avg pace
    map.forEach((s) => {
      if (s.avgPace && s.runs > 0) s.avgPace = s.avgPace / s.runs
    })

    const none = activities.filter((a) => !a.shoe).length
    setUnassigned(none)
    setStats(Array.from(map.values()).sort((a, b) => b.totalDistance - a.totalDistance))
  }

  useEffect(() => { compute() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scarpe</h1>
          <p className="text-gray-500 text-sm mt-0.5">{stats.length} modelli tracciati</p>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
            <p className="text-4xl mb-3">👟</p>
            <p className="text-gray-700 font-medium mb-1">Nessun dato scarpe</p>
            <p className="text-gray-400 text-sm">Importa activities.csv e shoes.csv dall&apos;export Strava</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <StravaExportUpload onImport={compute} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.name} className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">👟</span>
                      <div>
                        <p className="font-bold text-gray-900">{s.name}</p>
                        {s.shoe && (
                          <p className="text-xs text-gray-400">{s.shoe.brand} {s.shoe.model}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-500">
                      {(s.totalDistance / 1000).toFixed(0)} km
                    </p>
                    <p className="text-xs text-gray-400">totale</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-800">{s.runs}</p>
                    <p className="text-xs text-gray-400">corse</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-800">
                      {(s.totalDistance / 1000 / s.runs).toFixed(1)} km
                    </p>
                    <p className="text-xs text-gray-400">media a corsa</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-800">
                      {s.lastUsed ? formatDate(s.lastUsed) : '—'}
                    </p>
                    <p className="text-xs text-gray-400">ultimo uso</p>
                  </div>
                </div>

                {/* Mileage bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Chilometraggio</span>
                    <span>{(s.totalDistance / 1000).toFixed(0)} / 800 km</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.totalDistance / 1000 > 600 ? 'bg-red-400' :
                        s.totalDistance / 1000 > 400 ? 'bg-orange-400' : 'bg-green-400'
                      }`}
                      style={{ width: Math.min(100, (s.totalDistance / 1000 / 800) * 100) + '%' }}
                    />
                  </div>
                  {s.totalDistance / 1000 > 600 && (
                    <p className="text-xs text-red-500 mt-1">⚠ Considera di cambiare le scarpe</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {unassigned > 0 && (
            <p className="text-xs text-gray-400 text-center">
              {unassigned} corse senza scarpa assegnata
            </p>
          )}
        </>
      )}
    </div>
  )
}
