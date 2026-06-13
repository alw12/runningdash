'use client'
import { useRef } from 'react'
import { parseGpxFile } from '@/lib/gpx'
import { saveActivities, saveStream, getActivities, mergeActivities } from '@/lib/storage'
import { Activity, ActivityStream } from '@/types'

interface GpxUploadProps {
  onImport: (activities: Activity[]) => void
}

export function GpxUpload({ onImport }: GpxUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const results: Activity[] = []
    const streams: Record<string, ActivityStream> = {}

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.gpx')) continue
      const text = await file.text()
      try {
        const { activity, stream } = parseGpxFile(text, file.name)
        results.push(activity)
        streams[activity.id] = stream
      } catch {
        console.error('Failed to parse', file.name)
      }
    }

    if (results.length === 0) return

    Object.entries(streams).forEach(([id, stream]) => saveStream(id, stream))
    const merged = mergeActivities(getActivities(), results)
    saveActivities(merged)
    onImport(merged)
  }

  return (
    <div
      className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
      onClick={() => inputRef.current?.click()}
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
      <p className="text-gray-600 font-medium">Trascina file GPX qui</p>
      <p className="text-gray-400 text-sm mt-1">oppure clicca per selezionare</p>
    </div>
  )
}
