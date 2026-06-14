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
      <div className="d-flex gap-2 align-items-center flex-wrap">
        <button
          onClick={() => csvRef.current?.click()}
          disabled={loading}
          className="btn btn-brand d-flex align-items-center gap-2"
        >
          <span>🟠</span> Importa CSV
        </button>
        <input ref={csvRef} type="file" accept=".csv" className="d-none"
          onChange={(e) => handleCSV(e.target.files?.[0] ?? null)} />
        <button
          onClick={() => shoesRef.current?.click()}
          className="btn btn-secondary d-flex align-items-center gap-2"
        >
          <span>👟</span> Importa Scarpe
        </button>
        <input ref={shoesRef} type="file" accept=".csv" className="d-none"
          onChange={(e) => handleShoes(e.target.files?.[0] ?? null)} />
        {status && (
          <span className={`small ${status.error ? 'text-danger' : 'text-success'}`}>
            {status.error ?? `✓ ${status.count} corse${status.shoes ? `, ${status.shoes} scarpe` : ''}`}
          </span>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Drag area: Strava activities CSV */}
      <div
        className="border border-2 border-warning rounded-3 p-4 text-center mb-3"
        style={{ cursor: 'pointer', borderStyle: 'dashed' }}
        onClick={() => !loading && csvRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleCSV(e.dataTransfer.files[0]) }}
      >
        <input ref={csvRef} type="file" accept=".csv" className="d-none"
          onChange={(e) => handleCSV(e.target.files?.[0] ?? null)} />
        <div className="fs-2 mb-1">🟠</div>
        {loading ? (
          <p className="text-warning fw-semibold mb-0">Importazione…</p>
        ) : (
          <>
            <p className="fw-semibold text-secondary mb-1 small">activities.csv da Strava</p>
            <div className="alert alert-warning py-1 px-2 mb-0 small">
              Export dati → ZIP → activities.csv
            </div>
          </>
        )}
      </div>

      {/* Drag area: scarpe CSV */}
      <div
        className="border border-2 border-secondary rounded-3 p-3 text-center mb-3"
        style={{ cursor: 'pointer', borderStyle: 'dashed' }}
        onClick={() => shoesRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleShoes(e.dataTransfer.files[0]) }}
      >
        <input ref={shoesRef} type="file" accept=".csv" className="d-none"
          onChange={(e) => handleShoes(e.target.files?.[0] ?? null)} />
        <p className="text-secondary fw-semibold small mb-1">👟 shoes.csv da Strava</p>
        <small className="text-muted">Stesso export ZIP</small>
      </div>

      {(status?.count ?? 0) > 0 && (
        <div className="alert alert-success mt-2 py-2">
          ✓ {status?.count} corse{status?.shoes ? `, ${status.shoes} scarpe` : ''} importate
        </div>
      )}
      {status?.error && (
        <div className="alert alert-danger mt-2 py-2">{status.error}</div>
      )}
    </div>
  )
}
