'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from '@/types'
import { getActivities } from '@/lib/storage'
import { formatPace, formatDistance, formatDuration, formatDate } from '@/lib/utils'

type SortKey = 'date' | 'distance' | 'pace' | 'hr'

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [sort, setSort] = useState<SortKey>('date')

  useEffect(() => {
    setActivities(getActivities())
  }, [])

  const sorted = [...activities].sort((a, b) => {
    switch (sort) {
      case 'date': return new Date(b.date).getTime() - new Date(a.date).getTime()
      case 'distance': return b.distance - a.distance
      case 'pace': return (a.avgPace ?? 9999) - (b.avgPace ?? 9999)
      case 'hr': return (b.avgHeartRate ?? 0) - (a.avgHeartRate ?? 0)
    }
  })

  const cols: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Data' },
    { key: 'distance', label: 'Distanza' },
    { key: 'pace', label: 'Passo' },
    { key: 'hr', label: 'FC media' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Allenamenti ({activities.length})</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Ordina per:</span>
          {cols.map((c) => (
            <button
              key={c.key}
              onClick={() => setSort(c.key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                sort === c.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <div className="text-4xl mb-3">🏃</div>
          <p className="text-gray-500">
            Nessun allenamento.{' '}
            <Link href="/" className="text-blue-600 hover:underline">
              Torna alla dashboard
            </Link>{' '}
            per importare dati.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Data</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Distanza</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Durata</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Passo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">FC media</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">FC max</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Dislivello</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/activities/${a.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-gray-500">{formatDate(a.date)}</td>
                  <td className="px-4 py-4 text-right font-medium">{formatDistance(a.distance)}</td>
                  <td className="px-4 py-4 text-right text-gray-600">{formatDuration(a.duration)}</td>
                  <td className="px-4 py-4 text-right text-blue-600 font-medium">
                    {a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}
                  </td>
                  <td className="px-4 py-4 text-right text-red-500">
                    {a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}
                  </td>
                  <td className="px-4 py-4 text-right text-gray-600">
                    {a.maxHeartRate ? Math.round(a.maxHeartRate) + ' bpm' : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {a.elevationGain > 0 ? '+' + Math.round(a.elevationGain) + ' m' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
