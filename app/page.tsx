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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buongiorno, atleta 👟'
  if (h >= 12 && h < 18) return 'Buon pomeriggio, atleta 👟'
  return 'Buonasera, atleta 👟'
}

function ActivityTypeIcon({ type }: { type: string }) {
  const isWalkOrHike = /walk|hike/i.test(type)
  return <span className="text-2xl leading-none">{isWalkOrHike ? '🚶' : '🏃'}</span>
}

function TrendArrow({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  const diff = thisWeek - lastWeek
  if (Math.abs(diff) < 0.05) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400 mt-1">
        <span className="text-base leading-none">→</span>
        <span>invariato vs sett. prec.</span>
      </span>
    )
  }
  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 mt-1">
        <span className="text-base leading-none">↑</span>
        <span>+{diff.toFixed(1)} km vs sett. prec.</span>
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <span className="text-base leading-none">↓</span>
      <span>{diff.toFixed(1)} km vs sett. prec.</span>
    </span>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [shoes, setShoes] = useState<Shoe[]>([])
  const [showImport, setShowImport] = useState(false)
  // Inizializza stringa vuota per evitare hydration mismatch — viene settato in useEffect
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDED_KEY)) {
      router.replace('/onboarding')
      return
    }
    autoSeedIfEmpty().then(() => {
      const acts = getActivities()
      setActivities(acts)
      // Auto-crea oggetti Shoe dalle attività se getShoes() è vuoto
      let loadedShoes = getShoes()
      if (loadedShoes.length === 0) {
        const shoeNames = [...new Set(acts.map((a) => a.shoe).filter(Boolean))] as string[]
        loadedShoes = shoeNames.map((name) => ({
          id: name,
          brand: '',
          model: '',
          displayName: name,
          maxKm: 800,
        }))
      }
      setShoes(loadedShoes)
    })
  }, [router])

  function handleImport(imported: Activity[]) {
    const merged = mergeActivities(getActivities(), imported)
    saveActivities(merged)
    setActivities(merged)
    setShowImport(false)
  }

  const sorted = [...activities].sort((a, b) => b.date.localeCompare(a.date))
  const recent = sorted.slice(0, 30)
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

  // Questa settimana vs settimana precedente
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)

  const thisWeekKm = activities
    .filter((a) => new Date(a.date) >= weekAgo)
    .reduce((s, a) => s + a.distance / 1000, 0)

  const lastWeekKm = activities
    .filter((a) => {
      const d = new Date(a.date)
      return d >= twoWeeksAgo && d < weekAgo
    })
    .reduce((s, a) => s + a.distance / 1000, 0)

  if (activities.length === 0) {
    return (
      <div className="space-y-6">
        {greeting && (
          <p className="text-sm font-medium text-gray-500">{greeting}</p>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Importa i tuoi dati per iniziare</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-orange-500">🟠</span> Strava Export
            </h2>
            <StravaExportUpload onImport={handleImport} />
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
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
          {greeting && (
            <p className="text-sm font-medium text-gray-500 mb-0.5">{greeting}</p>
          )}
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
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
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 mb-3">🟠 Strava Export</p>
            <StravaExportUpload onImport={handleImport} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 mb-3">📂 File GPX</p>
            <GpxUpload onImport={handleImport} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Questa settimana — con trend */}
        <div className="rounded-2xl p-5 border bg-orange-50 border-orange-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Questa settimana</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{thisWeekKm.toFixed(1)} km</p>
          <TrendArrow thisWeek={thisWeekKm} lastWeek={lastWeekKm} />
        </div>

        <div className="rounded-2xl p-5 border bg-orange-50 border-orange-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Km totali</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalKm.toFixed(0)} km</p>
          <p className="text-xs text-gray-400 mt-1">{recent.length} corse</p>
        </div>

        <div className="rounded-2xl p-5 border bg-green-50 border-green-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Passo medio</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{avgPace > 0 ? formatPace(avgPace) + '/km' : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">ultime 30 corse</p>
        </div>

        <div className="rounded-2xl p-5 border bg-red-50 border-red-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">FC media</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{avgHR > 0 ? Math.round(avgHR) + ' bpm' : '—'}</p>
          <p className="text-xs text-gray-400 mt-1">ultime 30 corse</p>
        </div>
      </div>

      {/* Km chart */}
      <KmChart activities={activities} />

      {/* Scarpe attive */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Scarpe</h2>
        </div>
        {activeShoeStats.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Importa dati Strava per vedere le scarpe</p>
        ) : (
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
                      title={[shoe.brand, shoe.model, shoe.displayName].filter(Boolean).join(' ')}
                    >
                      {shoe.displayName}
                    </span>
                  </div>
                  {/* Barra usura */}
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
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
        )}
      </div>

      {/* Recent activities — cards spaziose */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Recenti</h2>
          <Link href="/activities" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            Tutti →
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {activities.slice(0, 6).map((a) => (
            <Link
              key={a.id}
              href={`/activities/${a.id}`}
              className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              {/* Icona tipo attività */}
              <div className="shrink-0 w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <ActivityTypeIcon type={a.type} />
              </div>

              {/* Info principale */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900 text-sm truncate">{a.name}</p>
                  {a.label && LABEL_STYLES[a.label] && (
                    <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${LABEL_STYLES[a.label].bg} ${LABEL_STYLES[a.label].text}`}>
                      {a.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(a.date)}{a.shoe ? ` · ${a.shoe}` : ''}</p>
              </div>

              {/* Metriche */}
              <div className="flex gap-5 text-right shrink-0">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{formatDistance(a.distance)}</p>
                  <p className="text-xs text-gray-500">dist</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-500">{a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}</p>
                  <p className="text-xs text-gray-500">passo</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-500">{a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}</p>
                  <p className="text-xs text-gray-500">FC</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">{formatDuration(a.duration)}</p>
                  <p className="text-xs text-gray-500">durata</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
