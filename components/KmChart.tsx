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
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-medium text-gray-700">{String(label ?? '')}</p>
      <p className="text-orange-500 font-semibold">{km.toFixed(2)} km</p>
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
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h2 className="font-semibold text-gray-800">Chilometri</h2>

        {/* Tab selector */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSetVista(key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                vista === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Selettore mese/anno (solo vista giornaliera) */}
      {vista === 'giornaliero' && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors text-base font-bold"
            aria-label="Mese precedente"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-700 min-w-[130px] text-center">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors text-base font-bold ${
              isCurrentMonth
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-800'
            }`}
            aria-label="Mese successivo"
          >
            ›
          </button>
        </div>
      )}

      {/* Chart */}
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
                  <Cell key={`cell-${i}`} fill={i === selectedIdx ? '#ea580c' : '#f97316'} />
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
                  <Cell key={`cell-${i}`} fill={i === selectedIdx ? '#ea580c' : '#f97316'} />
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
                  <Cell key={`cell-${i}`} fill={i === selectedIdx ? '#ea580c' : '#f97316'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      })()}

      {/* Mini-lista attività del periodo selezionato */}
      {selectedIdx !== null && (
        selectedActivities.length > 0 ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-2">Attività in questo periodo:</p>
            {selectedActivities.map((a) => (
              <a
                key={a.id}
                href={`/activities/${a.id}`}
                className="flex items-center justify-between py-2 hover:bg-gray-50 rounded px-2 group"
              >
                <span className="text-sm font-medium text-slate-900 group-hover:text-orange-600">
                  {a.name}
                </span>
                <span className="text-xs text-gray-500">
                  {(a.distance / 1000).toFixed(1)} km
                  {' · '}
                  {a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}
                  {' · '}
                  {formatDuration(a.duration)}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 mt-4 text-center">Nessuna attività in questo periodo</p>
        )
      )}
    </div>
  )
}
