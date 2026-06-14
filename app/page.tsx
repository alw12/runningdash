'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, Shoe } from '@/types'
import { getActivities, saveActivities, mergeActivities, getShoes } from '@/lib/storage'
import { autoSeedIfEmpty } from '@/lib/seed'

const ONBOARDED_KEY = 'rd_onboarded_v1'
import { KmChart } from '@/components/KmChart'
import { GpxUpload } from '@/components/GpxUpload'
import { StravaExportUpload } from '@/components/StravaExportUpload'
import { formatPace, formatDistance, formatDuration, formatDate } from '@/lib/utils'
import { LABEL_STYLES } from '@/lib/labels'

export default function Dashboard() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [shoes, setShoes] = useState<Shoe[]>([])
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDED_KEY)) {
      router.replace('/onboarding')
      return
    }
    autoSeedIfEmpty().then(() => {
      setActivities(getActivities())
      setShoes(getShoes())
    })
  }, [router])

  function handleImport(imported: Activity[]) {
    const merged = mergeActivities(getActivities(), imported)
    saveActivities(merged)
    setActivities(merged)
    setShowImport(false)
  }

  const recent = activities.slice(0, 30)
  const totalKm = recent.reduce((s, a) => s + a.distance, 0) / 1000
  const paceActs = recent.filter((a) => a.avgPace)
  const hrActs = recent.filter((a) => a.avgHeartRate)
  const avgPace = paceActs.length ? paceActs.reduce((s, a) => s + (a.avgPace ?? 0), 0) / paceActs.length : 0
  const avgHR = hrActs.length ? hrActs.reduce((s, a) => s + (a.avgHeartRate ?? 0), 0) / hrActs.length : 0
  // Scarpe attive: usate in almeno un'activity negli ultimi 90 giorni
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000)
  const recentActivities90 = activities.filter((a) => new Date(a.date) >= ninetyDaysAgo)
  const activeShoeNames = new Set(recentActivities90.map((a) => a.shoe).filter((x): x is string => Boolean(x)))

  const DEFAULT_MAX_KM = 800
  const activeShoeStats = shoes
    .filter((s) => activeShoeNames.has(s.displayName))
    .map((s) => {
      const totalKmShoe = activities
        .filter((a) => a.shoe === s.displayName)
        .reduce((sum, a) => sum + a.distance / 1000, 0)
      const maxKm = s.maxKm ?? DEFAULT_MAX_KM
      const wearPct = Math.min((totalKmShoe / maxKm) * 100, 100)
      return { shoe: s, totalKm: totalKmShoe, maxKm, wearPct }
    })
    .sort((a, b) => b.wearPct - a.wearPct)

  const thisWeekKm = activities
    .filter((a) => {
      const d = new Date(a.date)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 86400000)
      return d >= weekAgo
    })
    .reduce((s, a) => s + a.distance / 1000, 0)

  if (activities.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Importa i tuoi dati per iniziare</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-orange-500">🟠</span> Strava Export
            </h2>
            <StravaExportUpload onImport={handleImport} />
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>📂</span> File GPX
            </h2>
            <GpxUpload onImport={handleImport} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{activities.length} allenamenti totali</p>
        </div>
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Importa
        </button>
      </div>

      {showImport && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">🟠 Strava Export</p>
            <StravaExportUpload onImport={handleImport} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">📂 File GPX</p>
            <GpxUpload onImport={handleImport} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Questa settimana', value: thisWeekKm.toFixed(1) + ' km', sub: 'ultimi 7 giorni', color: 'bg-orange-50 border-orange-100' },
          { label: 'Km totali', value: totalKm.toFixed(0) + ' km', sub: `${recent.length} corse`, color: 'bg-blue-50 border-blue-100' },
          { label: 'Passo medio', value: avgPace > 0 ? formatPace(avgPace) + '/km' : '—', sub: 'ultime 30 corse', color: 'bg-green-50 border-green-100' },
          { label: 'FC media', value: avgHR > 0 ? Math.round(avgHR) + ' bpm' : '—', sub: 'ultime 30 corse', color: 'bg-red-50 border-red-100' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-5 border ${s.color}`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Km chart */}
      <KmChart activities={activities} />

      {/* Scarpe attive */}
      {activeShoeStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Scarpe</h2>
            <Link href="/shoes" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
              Vedi tutte →
            </Link>
          </div>
          <div className="space-y-3">
            {activeShoeStats.map(({ shoe, totalKm, maxKm, wearPct }) => {
              const isWorn = wearPct > 80
              const barColor =
                wearPct <= 50
                  ? 'bg-green-500'
                  : wearPct <= 80
                  ? 'bg-orange-400'
                  : 'bg-red-500'
              const remainingKm = Math.max(maxKm - totalKm, 0)
              return (
                <div key={shoe.id} className="flex items-center gap-3">
                  {/* Nome scarpa */}
                  <div className="w-36 shrink-0 flex items-center gap-1.5">
                    {isWorn && (
                      <span className="text-red-500 font-bold text-xs leading-none">!</span>
                    )}
                    <span
                      className={`text-sm truncate ${
                        isWorn ? 'text-red-600 font-semibold' : 'text-gray-700 font-medium'
                      }`}
                      title={shoe.displayName}
                    >
                      {shoe.displayName}
                    </span>
                  </div>
                  {/* Barra usura */}
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${wearPct}%` }}
                    />
                  </div>
                  {/* Km totali */}
                  <span className="text-xs text-gray-500 w-16 text-right shrink-0">
                    {Math.round(totalKm)} km
                  </span>
                  {/* Km rimanenti */}
                  <span className="text-xs text-gray-400 w-20 text-right shrink-0">
                    {Math.round(remainingKm)} km rimasti
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Recenti</h2>
          <Link href="/activities" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            Tutti →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {activities.slice(0, 6).map((a) => (
            <Link
              key={a.id}
              href={`/activities/${a.id}`}
              className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm truncate">{a.name}</p>
                  {a.label && LABEL_STYLES[a.label] && (
                    <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${LABEL_STYLES[a.label].bg} ${LABEL_STYLES[a.label].text}`}>
                      {a.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(a.date)}{a.shoe ? ` · ${a.shoe}` : ''}</p>
              </div>
              <div className="flex gap-5 text-right shrink-0 ml-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{formatDistance(a.distance)}</p>
                  <p className="text-xs text-gray-400">dist</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-600">{a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}</p>
                  <p className="text-xs text-gray-400">passo</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-500">{a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}</p>
                  <p className="text-xs text-gray-400">FC</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">{formatDuration(a.duration)}</p>
                  <p className="text-xs text-gray-400">durata</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
