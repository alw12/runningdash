'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, Shoe } from '@/types'
import { getActivities, saveActivities, mergeActivities, getShoes } from '@/lib/storage'
import { autoSeedIfEmpty } from '@/lib/seed'

import { KmChart } from '@/components/KmChart'
import { GpxUpload } from '@/components/GpxUpload'
import { StravaExportUpload } from '@/components/StravaExportUpload'
import { formatPace, formatDistance, formatDuration, formatDate } from '@/lib/utils'

const ONBOARDED_KEY = 'rd_onboarded_v1'

// Hex colors for activity labels — avoids Tailwind classes that don't exist in Bootstrap
const LABEL_COLORS: Record<string, string> = {
  'Gara':        '#ef4444',
  'Fondo lento': '#22c55e',
  'Interval':    '#a855f7',
  'Recupero':    '#6b7280',
  'Long run':    '#f97316',
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buongiorno, atleta 👟'
  if (h >= 12 && h < 18) return 'Buon pomeriggio, atleta 👟'
  return 'Buonasera, atleta 👟'
}

function ActivityTypeIcon({ type }: { type: string }) {
  const isWalkOrHike = /walk|hike/i.test(type)
  return <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{isWalkOrHike ? '🚶' : '🏃'}</span>
}

function TrendArrow({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  const diff = thisWeek - lastWeek
  if (Math.abs(diff) < 0.05) {
    return (
      <span className="d-flex align-items-center gap-1 text-muted mt-1" style={{ fontSize: '0.75rem' }}>
        <span>→</span>
        <span>invariato vs sett. prec.</span>
      </span>
    )
  }
  if (diff > 0) {
    return (
      <span className="d-flex align-items-center gap-1 text-success mt-1" style={{ fontSize: '0.75rem' }}>
        <span>↑</span>
        <span>+{diff.toFixed(1)} km vs sett. prec.</span>
      </span>
    )
  }
  return (
    <span className="d-flex align-items-center gap-1 text-danger mt-1" style={{ fontSize: '0.75rem' }}>
      <span>↓</span>
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
      <div>
        {greeting && (
          <p className="text-muted fw-medium small mb-3">{greeting}</p>
        )}
        <h1 className="h4 fw-bold mb-1">Dashboard</h1>
        <p className="text-muted small mb-4">Importa i tuoi dati per iniziare</p>

        <div className="row g-3">
          <div className="col-md-6">
            <div className="card border bg-light h-100">
              <div className="card-body">
                <h2 className="h6 fw-semibold mb-3">
                  <span className="text-brand">🟠</span> Strava Export
                </h2>
                <StravaExportUpload onImport={handleImport} />
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border bg-light h-100">
              <div className="card-body">
                <h2 className="h6 fw-semibold mb-3">
                  <span>📂</span> File GPX
                </h2>
                <GpxUpload onImport={handleImport} />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          {greeting && (
            <p className="text-muted fw-medium small mb-0">{greeting}</p>
          )}
          <h1 className="h4 fw-bold mb-0">Dashboard</h1>
          <p className="text-muted small mb-0">{activities.length} allenamenti totali</p>
        </div>
        <button
          onClick={() => setShowImport(!showImport)}
          className="btn btn-brand btn-sm d-flex align-items-center gap-2"
        >
          + Importa
        </button>
      </div>

      {/* Pannello importazione */}
      {showImport && (
        <div className="card border bg-light mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <p className="small fw-semibold mb-2">🟠 Strava Export</p>
                <StravaExportUpload onImport={handleImport} />
              </div>
              <div className="col-md-6">
                <p className="small fw-semibold mb-2">📂 File GPX</p>
                <GpxUpload onImport={handleImport} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {/* Questa settimana — con trend */}
        <div className="col-6 col-md-3">
          <div className="card h-100 border-0" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
            <div className="card-body">
              <p className="text-muted text-uppercase fw-medium mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Questa settimana</p>
              <p className="fs-5 fw-bold mb-0">{thisWeekKm.toFixed(1)} km</p>
              <TrendArrow thisWeek={thisWeekKm} lastWeek={lastWeekKm} />
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card h-100 border-0" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
            <div className="card-body">
              <p className="text-muted text-uppercase fw-medium mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Km totali</p>
              <p className="fs-5 fw-bold mb-0">{totalKm.toFixed(0)} km</p>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>{recent.length} corse</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card h-100 border-0" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <div className="card-body">
              <p className="text-muted text-uppercase fw-medium mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Passo medio</p>
              <p className="fs-5 fw-bold mb-0">{avgPace > 0 ? formatPace(avgPace) + '/km' : '—'}</p>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>ultime 30 corse</p>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card h-100 border-0" style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
            <div className="card-body">
              <p className="text-muted text-uppercase fw-medium mb-1" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>FC media</p>
              <p className="fs-5 fw-bold mb-0">{avgHR > 0 ? Math.round(avgHR) + ' bpm' : '—'}</p>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>ultime 30 corse</p>
            </div>
          </div>
        </div>
      </div>

      {/* Km chart */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <KmChart activities={activities} />
        </div>
      </div>

      {/* Scarpe attive */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 fw-semibold mb-3">Scarpe</h2>
          {activeShoeStats.length === 0 ? (
            <p className="text-muted small text-center py-3 mb-0">Importa dati Strava per vedere le scarpe</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {activeShoeStats.map(({ shoe, totalKm: totalKmShoe, maxKm, wearPct }) => {
                const isWorn = wearPct > 80
                const remainingKm = Math.max(maxKm - totalKmShoe, 0)
                const barBg =
                  wearPct > 80 ? '#dc3545' : wearPct > 60 ? '#ffc107' : '#198754'
                return (
                  <div key={shoe.id} className="d-flex align-items-center gap-3">
                    {/* Nome scarpa */}
                    <div className="d-flex align-items-center gap-1" style={{ width: '9rem', flexShrink: 0 }}>
                      {isWorn && (
                        <span className="text-danger fw-bold" style={{ fontSize: '0.75rem', lineHeight: 1 }}>!</span>
                      )}
                      <span
                        className={`small text-truncate ${isWorn ? 'text-danger fw-semibold' : 'fw-medium'}`}
                        title={[shoe.brand, shoe.model, shoe.displayName].filter(Boolean).join(' ')}
                      >
                        {shoe.displayName}
                      </span>
                    </div>

                    {/* Barra usura Bootstrap */}
                    <div className="flex-grow-1">
                      <div className="progress" style={{ height: '10px' }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${wearPct}%`, background: barBg }}
                          aria-valuenow={wearPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                    </div>

                    {/* Km totali */}
                    <span className="text-muted text-end" style={{ fontSize: '0.75rem', width: '4rem', flexShrink: 0 }}>
                      {Math.round(totalKmShoe)} km
                    </span>

                    {/* Km rimanenti */}
                    <span className="text-muted text-end" style={{ fontSize: '0.75rem', width: '5rem', flexShrink: 0 }}>
                      {Math.round(remainingKm)} km rimasti
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent activities */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
          <h2 className="h6 fw-semibold mb-0">Recenti</h2>
          <Link href="/activities" className="small text-brand fw-medium text-decoration-none">
            Tutti →
          </Link>
        </div>
        <div className="list-group list-group-flush">
          {activities.slice(0, 6).map((a) => (
            <Link
              key={a.id}
              href={`/activities/${a.id}`}
              className="list-group-item list-group-item-action px-4 py-3"
            >
              <div className="d-flex align-items-center gap-3">
                {/* Icona tipo attività */}
                <div
                  className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                  style={{ width: '2.5rem', height: '2.5rem', background: '#fff7ed' }}
                >
                  <ActivityTypeIcon type={a.type} />
                </div>

                {/* Info principale */}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-2">
                    <p className="fw-semibold small mb-0 text-truncate">{a.name}</p>
                    {a.label && LABEL_COLORS[a.label] && (
                      <span
                        className="badge-label flex-shrink-0"
                        style={{
                          backgroundColor: LABEL_COLORS[a.label] + '22',
                          color: LABEL_COLORS[a.label],
                          border: `1px solid ${LABEL_COLORS[a.label]}44`,
                        }}
                      >
                        {a.label}
                      </span>
                    )}
                  </div>
                  <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                    {formatDate(a.date)}{a.shoe ? ` · ${a.shoe}` : ''}
                  </p>
                </div>

                {/* Metriche */}
                <div className="d-flex gap-4 text-end flex-shrink-0">
                  <div>
                    <p className="small fw-semibold mb-0">{formatDistance(a.distance)}</p>
                    <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>dist</p>
                  </div>
                  <div>
                    <p className="small fw-semibold mb-0 text-brand">{a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}</p>
                    <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>passo</p>
                  </div>
                  <div>
                    <p className="small fw-semibold mb-0 text-danger">{a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}</p>
                    <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>FC</p>
                  </div>
                  <div>
                    <p className="small fw-semibold mb-0 text-secondary">{formatDuration(a.duration)}</p>
                    <p className="text-muted mb-0" style={{ fontSize: '0.7rem' }}>durata</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
