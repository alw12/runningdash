'use client'
import { useRef, useState } from 'react'
import { parseStravaExportCSV } from '@/lib/strava-export'
import { saveActivities, getActivities, mergeActivities } from '@/lib/storage'
import { Activity } from '@/types'

interface StravaExportUploadProps {
  onImport: (activities: Activity[]) => void
}

export function StravaExportUpload({ onImport }: StravaExportUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ count: number; error?: string } | null>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setLoading(true)
    setStatus(null)
    try {
      const text = await file.text()
      const imported = parseStravaExportCSV(text)
      if (imported.length === 0) throw new Error('Nessuna corsa trovata nel CSV')
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

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-orange-200 rounded-2xl p-6 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="text-2xl mb-1">🟠</div>
        {loading ? (
          <p className="text-orange-600 font-medium text-sm">Importazione…</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium text-sm">Importa activities.csv da Strava</p>
            <p className="text-gray-400 text-xs mt-1">
              Esporta dati da strava.com/athlete/delete_your_account → scarica ZIP → usa activities.csv
            </p>
          </>
        )}
      </div>

      {(status?.count ?? 0) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-700">
          ✓ Importate {status?.count} corse da Strava
        </div>
      )}
      {status?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700">
          {status.error}
        </div>
      )}
    </div>
  )
}
