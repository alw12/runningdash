'use client'
import { useEffect, useState, useRef } from 'react'
import { Activity, Shoe } from '@/types'
import { getActivities, getShoes, saveShoes } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import { StravaExportUpload } from '@/components/StravaExportUpload'

const DEFAULT_MAX_KM = 800

interface ShoeStats {
  shoe: Shoe | null
  name: string
  totalKm: number
  runs: number
  lastUsed?: string
  maxKm: number
}

function getWearColor(pct: number): string {
  if (pct <= 50) return 'bg-green-500'
  if (pct <= 80) return 'bg-orange-500'
  return 'bg-red-500'
}

function WearBar({ pct }: { pct: number }) {
  const color = getWearColor(pct)
  const clamped = Math.min(100, pct)
  return (
    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

// Inline-editable km max field
function MaxKmField({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(String(value))
    setEditing(true)
    // Focus after render
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commit() {
    const parsed = parseInt(draft, 10)
    if (!isNaN(parsed) && parsed > 0) onChange(parsed)
    setEditing(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="w-20 text-sm font-medium text-gray-700 border-b border-orange-400 bg-transparent outline-none text-right"
        autoFocus
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      title="Clicca per modificare il limite km"
      className="text-sm text-gray-400 hover:text-orange-500 hover:underline transition-colors cursor-pointer"
    >
      {value} km max
    </button>
  )
}

function ShoeCard({
  s,
  onMaxKmChange,
}: {
  s: ShoeStats
  onMaxKmChange: (name: string, maxKm: number) => void
}) {
  const pct = Math.round((s.totalKm / Math.max(1, s.maxKm)) * 100)
  const remaining = Math.max(0, s.maxKm - s.totalKm)
  const warn = pct > 80

  return (
    <div
      className={`bg-white rounded-2xl p-5 border transition-all ${
        warn ? 'border-red-400 shadow-sm shadow-red-100' : 'border-gray-200'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        {/* Left: nome + brand */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">👟</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 truncate">{s.name}</p>
              {warn && (
                <span className="text-xs font-semibold text-white bg-red-500 px-2 py-0.5 rounded-full shrink-0">
                  Da sostituire
                </span>
              )}
            </div>
            {s.shoe && (
              <p className="text-xs text-gray-400">
                {s.shoe.brand} {s.shoe.model}
              </p>
            )}
          </div>
        </div>

        {/* Right: km totali */}
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-orange-500">
            {s.totalKm.toFixed(0)} km
          </p>
          <p className="text-xs text-gray-400">percorsi</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 text-sm mb-4">
        <div>
          <span className="font-semibold text-gray-800">{s.runs}</span>
          <span className="text-gray-400 ml-1">corse</span>
        </div>
        <div>
          <span className="font-semibold text-gray-800">
            {s.runs > 0 ? (s.totalKm / s.runs).toFixed(1) : '—'} km
          </span>
          <span className="text-gray-400 ml-1">media</span>
        </div>
        {s.lastUsed && (
          <div>
            <span className="font-semibold text-gray-800">{formatDate(s.lastUsed)}</span>
            <span className="text-gray-400 ml-1">ultimo uso</span>
          </div>
        )}
      </div>

      {/* Wear bar section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span
              className={`font-bold text-base ${
                pct > 80
                  ? 'text-red-500'
                  : pct > 50
                  ? 'text-orange-500'
                  : 'text-green-600'
              }`}
            >
              {pct}% usura
            </span>
            <span
              className={`font-bold ${warn ? 'text-red-500' : 'text-gray-700'}`}
            >
              {remaining.toFixed(0)} km rimanenti
            </span>
          </div>
          <MaxKmField
            value={s.maxKm}
            onChange={(v) => onMaxKmChange(s.name, v)}
          />
        </div>
        <WearBar pct={pct} />
      </div>
    </div>
  )
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
      if (key === '__none__') continue

      if (!map.has(key)) {
        const shoe = shoes.find((s) => s.displayName === key) ?? null
        const maxKm = shoe?.maxKm ?? DEFAULT_MAX_KM
        map.set(key, { shoe, name: key, totalKm: 0, runs: 0, maxKm })
      }
      const s = map.get(key)!
      s.totalKm += a.distance / 1000
      s.runs += 1
      if (!s.lastUsed || a.date > s.lastUsed) s.lastUsed = a.date
    }

    const none = activities.filter((a) => !a.shoe).length
    setUnassigned(none)

    // Ordina per % usura decrescente (piu usurate prima)
    const arr = Array.from(map.values()).sort(
      (a, b) => b.totalKm / b.maxKm - a.totalKm / a.maxKm
    )
    setStats(arr)
  }

  function handleMaxKmChange(name: string, newMaxKm: number) {
    // Aggiorna maxKm nel localStorage tramite saveShoes
    const shoes = getShoes()
    const updated = shoes.map((s) =>
      s.displayName === name ? { ...s, maxKm: newMaxKm } : s
    )
    // Se la scarpa non e' nel registro shoes (rara ma possibile), la aggiungiamo
    if (!updated.find((s) => s.displayName === name)) {
      updated.push({
        id: name,
        brand: '',
        model: '',
        displayName: name,
        maxKm: newMaxKm,
      })
    }
    saveShoes(updated)
    // Ricalcola stats con il nuovo maxKm
    setStats((prev) =>
      prev
        .map((s) => (s.name === name ? { ...s, maxKm: newMaxKm } : s))
        .sort((a, b) => b.totalKm / b.maxKm - a.totalKm / a.maxKm)
    )
  }

  useEffect(() => {
    compute()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scarpe</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {stats.length} modelli tracciati
          </p>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-200">
            <p className="text-4xl mb-3">👟</p>
            <p className="text-gray-700 font-medium mb-1">Nessun dato scarpe</p>
            <p className="text-gray-400 text-sm">
              Importa activities.csv e shoes.csv dall&apos;export Strava
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <StravaExportUpload onImport={compute} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {stats.map((s) => (
              <ShoeCard
                key={s.name}
                s={s}
                onMaxKmChange={handleMaxKmChange}
              />
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
