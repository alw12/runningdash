'use client'
import { useRef, useState } from 'react'
import { parseStravaExportCSV, parseShoesCSV } from '@/lib/strava-export'
import { saveActivities, getActivities, mergeActivities, saveShoes, getShoes, mergeShoes } from '@/lib/storage'
import { Activity } from '@/types'

interface StravaExportUploadProps {
  onImport: (activities: Activity[]) => void
  compact?: boolean
}

export function StravaExportUpload({ onImport, compact }: StravaExportUploadProps) {
  const csvRef = useRef<HTMLInputElement>(null)
  const shoesRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ count: number; shoes?: number; error?: string } | null>(null)

  async function handleCSV(file: File | null) {
    if (!file) return
    setLoading(true)
    setStatus(null)
    try {
      const text = await file.text()
      const imported = parseStravaExportCSV(text)
      if (imported.length === 0) throw new Error('Nessuna corsa trovata')
      const merged = mergeActivities(getActivities(), imported)
      saveActivities(merged)
      onImport(merged)
      setStatus({ count: imported.length })
    } catch (e) {
      setStatus({ count: 0, error: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  async function handleShoes(file: File | null) {
    if (!file) return
    const text = await file.text()
    const incoming = parseShoesCSV(text)
    const merged = mergeShoes(getShoes(), incoming)
    saveShoes(merged)
    setStatus((s) => ({ count: s?.count ?? 0, shoes: incoming.length }))
  }

  if (compact) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => csvRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <span>🟠</span> Importa CSV
        </button>
        <input ref={csvRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => handleCSV(e.target.files?.[0] ?? null)} />
        <button
          onClick={() => shoesRef.current?.click()}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span>👟</span> Importa Scarpe
        </button>
        <input ref={shoesRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => handleShoes(e.target.files?.[0] ?? null)} />
        {status && (
          <span className="text-sm text-green-600 flex items-center">
            {status.error ?? `✓ ${status.count} corse${status.shoes ? `, ${status.shoes} scarpe` : ''}`}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-orange-200 rounded-xl p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
        onClick={() => !loading && csvRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleCSV(e.dataTransfer.files[0]) }}
      >
        <input ref={csvRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => handleCSV(e.target.files?.[0] ?? null)} />
        <div className="text-2xl mb-1">🟠</div>
        {loading ? (
          <p className="text-orange-600 font-medium text-sm">Importazione…</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium text-sm">activities.csv da Strava</p>
            <p className="text-gray-400 text-xs mt-1">Export dati → ZIP → activities.csv</p>
          </>
        )}
      </div>

      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
        onClick={() => shoesRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleShoes(e.dataTransfer.files[0]) }}
      >
        <input ref={shoesRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => handleShoes(e.target.files?.[0] ?? null)} />
        <p className="text-gray-600 text-sm font-medium">👟 shoes.csv da Strava</p>
        <p className="text-gray-400 text-xs mt-0.5">Stesso export ZIP</p>
      </div>

      {(status?.count ?? 0) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">
          ✓ {status?.count} corse{status?.shoes ? `, ${status.shoes} scarpe` : ''} importate
        </div>
      )}
      {status?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
          {status.error}
        </div>
      )}
    </div>
  )
}
