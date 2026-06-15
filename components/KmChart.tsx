'use client'
import { useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  getDaysInMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  format,
} from 'date-fns'
import { it } from 'date-fns/locale'
import { Activity } from '@/types'
import { formatPace, formatDuration } from '@/lib/utils'

interface KmChartProps {
  activities: Activity[]
}

type Vista = 'giornaliero' | 'settimanale' | 'mensile'

const TAB_LABELS: { key: Vista; label: string }[] = [
  { key: 'giornaliero', label: 'Giornaliero' },
  { key: 'settimanale', label: 'Settimanale' },
  { key: 'mensile', label: 'Mensile' },
]

// Tooltip personalizzato con props any per compatibilita' con recharts v3
// (ValueType/NameType non sono esportati come named export in recharts v3)
function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  const km = payload[0].value ?? 0
  return (
    <div style={{
      background: 'var(--rd-sidebar-bg)',
      color: '#fff',
      borderRadius: 'var(--rd-radius-md)',
      padding: '8px 12px',
      fontSize: 'var(--rd-font-size-sm)',
      boxShadow: 'var(--rd-shadow-md)',
    }}>
      <p style={{ color: 'var(--rd-text-muted)', margin: '0 0 2px', fontSize: 'var(--rd-font-size-xs)' }}>{String(label ?? '')}</p>
      <p style={{ color: 'var(--rd-brand)', fontWeight: 600, margin: 0 }}>{km.toFixed(2)} km</p>
    </div>
  )
}

// ---- GIORNALIERO ----
function buildGiornalieroData(activities: Activity[], year: number, month: number) {
  // month e' 0-based (come Date)
  const refDate = new Date(year, month, 1)
  const daysInMonth = getDaysInMonth(refDate)

  const data: { giorno: string; km: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(year, month, d)
    const km = activities
      .filter((a) => isSameDay(new Date(a.date), dayDate))
      .reduce((sum, a) => sum + a.distance / 1000, 0)
    data.push({ giorno: String(d), km: parseFloat(km.toFixed(2)) })
  }
  return data
}

// Filtra attività per il giorno selezionato nella vista giornaliera
function filterGiornaliero(activities: Activity[], year: number, month: number, giorno: string): Activity[] {
  const dayDate = new Date(year, month, parseInt(giorno, 10))
  return activities.filter((a) => isSameDay(new Date(a.date), dayDate))
}

// ---- SETTIMANALE ----
function buildSettimanaleData(activities: Activity[]) {
  const now = new Date()
  const data: { settimana: string; km: number }[] = []

  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const label = format(weekStart, 'dd MMM', { locale: it })

    const km = activities
      .filter((a) => {
        const d = new Date(a.date)
        return isWithinInterval(d, { start: weekStart, end: weekEnd })
      })
      .reduce((sum, a) => sum + a.distance / 1000, 0)

    data.push({ settimana: label, km: parseFloat(km.toFixed(2)) })
  }
  return data
}

// Filtra attività per la settimana il cui label corrisponde a quello della barra cliccata
function filterSettimanale(activities: Activity[], settimanaLabel: string): Activity[] {
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    const label = format(weekStart, 'dd MMM', { locale: it })
    if (label === settimanaLabel) {
      return activities.filter((a) => {
        const d = new Date(a.date)
        return isWithinInterval(d, { start: weekStart, end: weekEnd })
      })
    }
  }
  return []
}

const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

// ---- MENSILE ----
function buildMensileData(activities: Activity[]) {
  const now = new Date()
  const MONTH_ABBR = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
  const data: { mese: string; km: number }[] = []

  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(startOfMonth(now), i)
    const label = MONTH_ABBR[monthDate.getMonth()] + ' ' + String(monthDate.getFullYear()).slice(2)

    const km = activities
      .filter((a) => isSameMonth(new Date(a.date), monthDate))
      .reduce((sum, a) => sum + a.distance / 1000, 0)

    data.push({ mese: label, km: parseFloat(km.toFixed(2)) })
  }
  return data
}

// Filtra attività per il mese il cui label corrisponde a quello della barra cliccata
function filterMensile(activities: Activity[], meseLabel: string): Activity[] {
  const now = new Date()
  const MONTH_ABBR = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(startOfMonth(now), i)
    const label = MONTH_ABBR[monthDate.getMonth()] + ' ' + String(monthDate.getFullYear()).slice(2)
    if (label === meseLabel) {
      return activities.filter((a) => isSameMonth(new Date(a.date), monthDate))
    }
  }
  return []
}

export function KmChart({ activities }: KmChartProps) {
  const now = new Date()
  const [vista, setVista] = useState<Vista>('settimanale')
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-based
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  // Resetta la selezione quando si cambia vista o mese
  const handleSetVista = useCallback((v: Vista) => {
    setVista(v)
    setSelectedIdx(null)
  }, [])

  // Navigazione mese per vista giornaliera
  const prevMonth = useCallback(() => {
    setSelectedIdx(null)
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }, [selectedMonth])

  const nextMonth = useCallback(() => {
    setSelectedIdx(null)
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }, [selectedMonth])

  // Non permettere di andare oltre il mese corrente
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth()

  if (activities.length === 0) return null

  // Calcola le attività selezionate in base alla vista e alla barra cliccata
  let selectedActivities: Activity[] = []
  if (selectedIdx !== null) {
    if (vista === 'giornaliero') {
      const data = buildGiornalieroData(activities, selectedYear, selectedMonth)
      const entry = data[selectedIdx]
      if (entry) {
        selectedActivities = filterGiornaliero(activities, selectedYear, selectedMonth, entry.giorno)
      }
    } else if (vista === 'settimanale') {
      const data = buildSettimanaleData(activities)
      const entry = data[selectedIdx]
      if (entry) {
        selectedActivities = filterSettimanale(activities, entry.settimana)
      }
    } else if (vista === 'mensile') {
      const data = buildMensileData(activities)
      const entry = data[selectedIdx]
      if (entry) {
        selectedActivities = filterMensile(activities, entry.mese)
      }
    }
  }

  // Handler click barra: toggle selezione
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (_: any, idx: number) => {
    setSelectedIdx(idx === selectedIdx ? null : idx)
  }

  return (
    <div className="card">
      <div className="card-body">
        {/* Header */}
        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-sm-between gap-2 mb-3">
          <h2 className="h6 fw-semibold mb-0">Chilometri</h2>

          {/* Tab selector — segmented pill control */}
          <div className="rd-segmented" role="group" aria-label="Vista chilometri">
            {TAB_LABELS.map(({ key, label }) => (
              <button
                key={key}
                className={`rd-segmented-btn${vista === key ? ' active' : ''}`}
                onClick={() => handleSetVista(key)}
                aria-pressed={vista === key}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Selettore mese/anno (solo vista giornaliera) */}
        {vista === 'giornaliero' && (
          <div className="d-flex align-items-center gap-2 mb-3">
            <button
              onClick={prevMonth}
              className="btn btn-sm btn-outline-secondary"
              aria-label="Mese precedente"
              style={{ width: '1.75rem', height: '1.75rem', padding: 0, lineHeight: 1 }}
            >
              ‹
            </button>
            <span className="small fw-medium text-center" style={{ minWidth: '130px' }}>
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="btn btn-sm btn-outline-secondary"
              aria-label="Mese successivo"
              style={{ width: '1.75rem', height: '1.75rem', padding: 0, lineHeight: 1 }}
            >
              ›
            </button>
          </div>
        )}

        {/* Chart */}
        <div className="mt-2">
          {vista === 'giornaliero' && (() => {
            const data = buildGiornalieroData(activities, selectedYear, selectedMonth)
            return (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="giorno"
                    tick={{ fontSize: 10 }}
                    interval={1}
                  />
                  <YAxis tick={{ fontSize: 11 }} unit=" km" width={48} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip content={(props: any) => <CustomTooltip {...props} />} />
                  <Bar dataKey="km" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                    {data.map((_, i) => (
                      <Cell key={`cell-${i}`} fill="var(--rd-distance)" fillOpacity={selectedIdx === null || i === selectedIdx ? 1 : 0.45} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          })()}

          {vista === 'settimanale' && (() => {
            const data = buildSettimanaleData(activities)
            return (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="settimana" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" km" width={48} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip content={(props: any) => <CustomTooltip {...props} />} />
                  <Bar dataKey="km" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                    {data.map((_, i) => (
                      <Cell key={`cell-${i}`} fill="var(--rd-distance)" fillOpacity={selectedIdx === null || i === selectedIdx ? 1 : 0.45} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          })()}

          {vista === 'mensile' && (() => {
            const data = buildMensileData(activities)
            return (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="mese" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" km" width={48} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip content={(props: any) => <CustomTooltip {...props} />} />
                  <Bar dataKey="km" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                    {data.map((_, i) => (
                      <Cell key={`cell-${i}`} fill="var(--rd-distance)" fillOpacity={selectedIdx === null || i === selectedIdx ? 1 : 0.45} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          })()}
        </div>

        {/* Mini-lista attività del periodo selezionato */}
        {selectedIdx !== null && (
          selectedActivities.length > 0 ? (
            <div className="mt-3 border-top pt-3">
              <p className="text-muted small mb-2">Attività in questo periodo:</p>
              <div className="list-group list-group-flush">
                {selectedActivities.map((a) => (
                  <a
                    key={a.id}
                    href={`/activities/${a.id}`}
                    className="list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-2"
                  >
                    <span className="small fw-medium text-dark">
                      {a.name}
                    </span>
                    <span className="small text-muted">
                      {(a.distance / 1000).toFixed(1)} km
                      {' · '}
                      {a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}
                      {' · '}
                      {formatDuration(a.duration)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted small text-center mt-3">Nessuna attività in questo periodo</p>
          )
        )}
      </div>
    </div>
  )
}
