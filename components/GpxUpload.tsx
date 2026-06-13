'use client'
import { useRef, useState } from 'react'
import { parseGpxFile } from '@/lib/gpx'
import { saveActivities, saveStream, getActivities, mergeActivities } from '@/lib/storage'
import { Activity } from '@/types'

interface GpxUploadProps {
  onImport: (activities: Activity[]) => void
}

export function GpxUpload({ onImport }: GpxUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ count: number; error?: string } | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    setLoading(true)
    setStatus(null)

    let totalImported = 0
    const errors: string[] = []

    for (const file of Array.from(files)) {
      if (!file.name.toLowerCase().endsWith('.gpx')) continue
      const text = await file.text()
      try {
        const parsed = parseGpxFile(text, file.name)
        for (const { activity, stream } of parsed) {
          saveStream(activity.id, stream)
        }
        const activities = parsed.map((p) => p.activity)
        const merged = mergeActivities(getActivities(), activities)
        saveActivities(merged)
        onImport(merged)
        totalImported += activities.length
      } catch (e) {
        errors.push(file.name + ': ' + (e as Error).message)
      }
    }

    setLoading(false)
    setStatus({
      count: totalImported,
      error: errors.length > 0 ? errors.join(', ') : undefined,
    })
  }

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".gpx"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-3xl mb-2">📂</div>
        {loading ? (
          <p className="text-blue-600 font-medium">Importazione in corso…</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">Trascina file GPX qui</p>
            <p className="text-gray-400 text-sm mt-1">
              Anche file con più corse — clicca per selezionare
            </p>
          </>
        )}
      </div>

      {(status?.count ?? 0) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          ✓ Importate {status?.count} corse
        </div>
      )}
      {status?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {status.error}
        </div>
      )}
    </div>
  )
}
