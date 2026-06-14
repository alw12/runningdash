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
    <div>
      <div
        className="border border-2 border-secondary rounded-3 p-5 text-center"
        style={{ cursor: 'pointer', borderStyle: 'dashed' }}
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
          className="d-none"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="fs-1 mb-2">📂</div>
        {loading ? (
          <p className="text-primary fw-semibold">Importazione in corso…</p>
        ) : (
          <>
            <p className="fw-semibold text-secondary mb-1">Trascina file GPX qui</p>
            <small className="text-muted">Anche file con più corse — clicca per selezionare</small>
          </>
        )}
      </div>

      {(status?.count ?? 0) > 0 && (
        <div className="alert alert-success mt-2 py-2">✓ Importate {status?.count} corse</div>
      )}
      {status?.error && (
        <div className="alert alert-danger mt-2 py-2">{status.error}</div>
      )}
    </div>
  )
}
