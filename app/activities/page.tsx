'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from '@/types'
import { getActivities, deleteActivities } from '@/lib/storage'
import { formatPace, formatDistance, formatDuration, formatDate, activityLabel, isWalk } from '@/lib/utils'

type SortKey = 'date' | 'distance' | 'pace' | 'hr'

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [sort, setSort] = useState<SortKey>('date')
  const [typeFilter, setTypeFilter] = useState<'all' | 'run' | 'walk'>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulk, setConfirmBulk] = useState(false)

  useEffect(() => { setActivities(getActivities()) }, [])

  const visible = activities.filter(a => {
    if (typeFilter === 'run') return !isWalk(a.avgPace)
    if (typeFilter === 'walk') return isWalk(a.avgPace)
    return true
  })

  const sorted = [...visible].sort((a, b) => {
    switch (sort) {
      case 'date':     return new Date(b.date).getTime() - new Date(a.date).getTime()
      case 'distance': return b.distance - a.distance
      case 'pace':     return (a.avgPace ?? 9999) - (b.avgPace ?? 9999)
      case 'hr':       return (b.avgHeartRate ?? 0) - (a.avgHeartRate ?? 0)
    }
  })

  const allSelected = sorted.length > 0 && sorted.every((a) => selected.has(a.id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map((a) => a.id)))
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function bulkDelete() {
    const ids = Array.from(selected)
    deleteActivities(ids)
    setActivities((prev) => prev.filter((a) => !selected.has(a.id)))
    setSelected(new Set())
    setConfirmBulk(false)
  }

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Data' },
    { key: 'distance', label: 'Distanza' },
    { key: 'pace', label: 'Passo' },
    { key: 'hr', label: 'FC' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Allenamenti</h1>
          <p className="text-gray-500 text-sm mt-0.5">{activities.length} corse totali</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            confirmBulk ? (
              <>
                <span className="text-sm text-gray-600">Eliminare {selected.size} corse?</span>
                <button onClick={bulkDelete} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
                  Conferma
                </button>
                <button onClick={() => setConfirmBulk(false)} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5">
                  Annulla
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmBulk(true)}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
              >
                🗑 Elimina {selected.size} selezionate
              </button>
            )
          )}
        </div>
      </div>

      {/* Sort */}
      {/* Type filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['all','Tutti'], ['run','Corse'], ['walk','Passeggiate']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTypeFilter(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Ordina:</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sort === s.key
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
          <p className="text-4xl mb-3">🏃</p>
          <p className="text-gray-500 text-sm">
            Nessun allenamento.{' '}
            <Link href="/" className="text-orange-500 hover:underline">Importa dati →</Link>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 text-left w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 accent-orange-500"
                  />
                </th>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3">Data</th>
                <th className="text-right px-4 py-3">Dist</th>
                <th className="text-right px-4 py-3">Durata</th>
                <th className="text-right px-4 py-3">Passo</th>
                <th className="text-right px-4 py-3">FC med</th>
                <th className="text-right px-4 py-3">FC max</th>
                <th className="text-right px-4 py-3">↑ m</th>
                <th className="text-left px-4 py-3">Scarpe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((a) => (
                <tr
                  key={a.id}
                  className={`transition-colors ${selected.has(a.id) ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggle(a.id)}
                      className="rounded border-gray-300 accent-orange-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/activities/${a.id}`} className="font-medium text-gray-900 hover:text-orange-500 transition-colors">
                        {a.name}
                      </Link>
                      {isWalk(a.avgPace) && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">
                          passeggiata
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(a.date)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatDistance(a.distance)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatDuration(a.duration)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">
                    {a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-red-500 font-semibold">
                    {a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {a.maxHeartRate ? Math.round(a.maxHeartRate) + ' bpm' : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {a.elevationGain > 0 ? '+' + Math.round(a.elevationGain) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{a.shoe ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
