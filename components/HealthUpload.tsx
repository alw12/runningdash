'use client'
import { useRef, useState } from 'react'
import { parseAppleHealthZip } from '@/lib/apple-health'
import { saveActivities, saveStream, getActivities, mergeActivities } from '@/lib/storage'
import { Activity } from '@/types'

interface HealthUploadProps {
  onImport: (activities: Activity[]) => void
}

export function HealthUpload({ onImport }: HealthUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imported, setImported] = useState<number | null>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setLoading(true)
    setError(null)
    setImported(null)
    try {
      const { activities, streams } = await parseAppleHealthZip(file)
      Object.entries(streams).forEach(([id, stream]) => saveStream(id, stream))
      const merged = mergeActivities(getActivities(), activities)
      saveActivities(merged)
      setImported(activities.length)
      onImport(merged)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files[0]
          if (f?.name.endsWith('.zip')) handleFile(f)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="text-3xl mb-2">🍎</div>
        {loading ? (
          <p className="text-blue-600 font-medium">Importazione in corso…</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">Importa Apple Health export</p>
            <p className="text-gray-400 text-sm mt-1">Trascina il file export.zip o clicca</p>
          </>
        )}
      </div>

      {imported !== null && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          ✓ Importate {imported} corse da Apple Health
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Per esportare: iPhone → Salute → profilo in alto a destra → Esporta dati
      </p>
    </div>
  )
}
