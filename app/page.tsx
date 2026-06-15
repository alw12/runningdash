'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, Shoe } from '@/types'
import { getActivities, saveActivities, mergeActivities, getShoes } from '@/lib/storage'
import { autoSeedIfEmpty } from '@/lib/seed'

import { KmChart } from '@/components/KmChart'
import { StatCard } from '@/components/StatCard'
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
            <div className="card h-100">
              <div className="card-body">
                <p className="rd-section-label">Strava Export</p>
                <StravaExportUpload onImport={handleImport} />
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <p className="rd-section-label">File GPX</p>
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
      {/* Page header */}
      <div className="rd-page-header">
        <div>
          <h1 className="rd-page-title">Dashboard</h1>
          <p className="rd-page-subtitle">{activities.length} allenamenti totali</p>
        </div>
        <button
          onClick={() => setShowImport(!showImport)}
          className="btn btn-brand btn-sm"
        >
          + Importa
        </button>
      </div>

      {/* Pannello importazione */}
      {showImport && (
        <div className="card mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <p className="small fw-semibold mb-2" style={{ color: 'var(--rd-text-secondary)' }}>Strava Export</p>
                <StravaExportUpload onImport={handleImport} />
              </div>
              <div className="col-md-6">
                <p className="small fw-semibold mb-2" style={{ color: 'var(--rd-text-secondary)' }}>File GPX</p>
                <GpxUpload onImport={handleImport} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard
            label="Questa settimana"
            value={`${thisWeekKm.toFixed(1)} km`}
            variant="orange"
            trend={{ value: thisWeekKm - lastWeekKm, unit: 'km' }}
          />
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label="Km totali"
            value={`${totalKm.toFixed(0)} km`}
            sub={`${recent.length} corse`}
            variant="orange"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label="Passo medio"
            value={avgPace > 0 ? formatPace(avgPace) + '/km' : '—'}
            valueA11y={avgPace > 0 ? `${formatPace(avgPace)} al chilometro` : 'non disponibile'}
            sub="ultime 30 corse"
            variant="green"
          />
        </div>
        <div className="col-6 col-md-3">
          <StatCard
            label="FC media"
            value={avgHR > 0 ? `${Math.round(avgHR)} bpm` : '—'}
            valueA11y={avgHR > 0 ? `${Math.round(avgHR)} battiti al minuto` : 'non disponibile'}
            sub="ultime 30 corse"
            variant="red"
          />
        </div>
      </div>

      {/* Km chart + Scarpe — side-by-side on xl */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <KmChart activities={activities} />
        </div>
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <p className="rd-section-label">Scarpe</p>
              {activeShoeStats.length === 0 ? (
                <p className="text-muted small text-center py-3 mb-0">Importa dati Strava per vedere le scarpe</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {activeShoeStats.map(({ shoe, totalKm: totalKmShoe, maxKm, wearPct }) => {
                    const isWorn = wearPct > 80
                    const remainingKm = Math.max(maxKm - totalKmShoe, 0)
                    const barBg =
                      wearPct > 80 ? 'var(--rd-danger)' : wearPct > 60 ? 'var(--rd-warning)' : 'var(--rd-success)'
                    return (
                      <div key={shoe.id}>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span
                            className={`small text-truncate ${isWorn ? 'text-danger fw-semibold' : 'fw-medium'}`}
                            title={[shoe.brand, shoe.model, shoe.displayName].filter(Boolean).join(' ')}
                          >
                            {isWorn && <span className="me-1">!</span>}{shoe.displayName}
                          </span>
                          <span className="text-muted ms-2 text-nowrap" style={{ fontSize: '0.72rem', flexShrink: 0 }}>
                            {Math.round(totalKmShoe)} km · {Math.round(remainingKm)} rimasti
                          </span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
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
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="card">
        <div className="card-body pt-3 pb-0 px-3 d-flex justify-content-between align-items-center">
          <p className="rd-section-label mb-0">Recenti</p>
          <Link href="/activities" className="small text-brand fw-medium text-decoration-none" style={{ fontSize: 'var(--rd-font-size-sm)' }}>
            Tutti →
          </Link>
        </div>
        <div className="card-body p-3 pt-2">
          {activities.slice(0, 8).map((a) => (
            <Link
              key={a.id}
              href={`/activities/${a.id}`}
              className="rd-activity-row"
            >
              {/* Icon avatar */}
              <div className="rd-activity-icon" aria-hidden="true">
                <ActivityTypeIcon type={a.type} />
              </div>

              {/* Info principale */}
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2">
                  <p
                    className="mb-0 text-truncate"
                    style={{ fontSize: 'var(--rd-font-size-base)', fontWeight: 600, color: 'var(--rd-text-primary)' }}
                  >
                    {a.name}
                  </p>
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
                <p className="mb-0" style={{ fontSize: 'var(--rd-font-size-xs)', color: 'var(--rd-text-muted)' }}>
                  {formatDate(a.date)}{a.shoe ? ` · ${a.shoe}` : ''}
                </p>
              </div>

              {/* Metriche */}
              <div className="d-flex gap-3 text-end flex-shrink-0">
                <div className="rd-metric-cell">
                  <p className="rd-metric-value mb-0">{formatDistance(a.distance)}</p>
                  <p className="rd-metric-label mb-0">dist</p>
                </div>
                <div className="rd-metric-cell">
                  <p className="rd-metric-value mb-0" style={{ color: 'var(--rd-brand)' }}>
                    {a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}
                  </p>
                  <p className="rd-metric-label mb-0">passo</p>
                </div>
                <div className="rd-metric-cell d-none d-sm-block">
                  <p className="rd-metric-value mb-0" style={{ color: 'var(--rd-hr)' }}>
                    {a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}
                  </p>
                  <p className="rd-metric-label mb-0">FC</p>
                </div>
                <div className="rd-metric-cell d-none d-sm-block">
                  <p className="rd-metric-value mb-0" style={{ color: 'var(--rd-text-secondary)' }}>
                    {formatDuration(a.duration)}
                  </p>
                  <p className="rd-metric-label mb-0">durata</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
