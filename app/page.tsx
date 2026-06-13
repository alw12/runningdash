'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity } from '@/types'
import { getActivities, saveActivities, mergeActivities } from '@/lib/storage'
import { StatCard } from '@/components/StatCard'
import { WeeklyChart } from '@/components/WeeklyChart'
import { GpxUpload } from '@/components/GpxUpload'
import { formatPace, formatDistance, formatDate } from '@/lib/utils'

export default function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    setActivities(getActivities())
  }, [])

  function handleImport(imported: Activity[]) {
    const merged = mergeActivities(getActivities(), imported)
    saveActivities(merged)
    setActivities(merged)
  }

  const recent = activities.slice(0, 30)
  const totalKm = recent.reduce((s, a) => s + a.distance, 0) / 1000
  const paceActivities = recent.filter((a) => a.avgPace)
  const hrActivities = recent.filter((a) => a.avgHeartRate)
  const avgPace = paceActivities.length
    ? paceActivities.reduce((s, a) => s + (a.avgPace ?? 0), 0) / paceActivities.length
    : 0
  const avgHR = hrActivities.length
    ? hrActivities.reduce((s, a) => s + (a.avgHeartRate ?? 0), 0) / hrActivities.length
    : 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {activities.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Allenamenti" value={String(recent.length)} icon="🏃" />
            <StatCard label="Distanza totale" value={totalKm.toFixed(0) + ' km'} icon="📏" />
            <StatCard label="Passo medio" value={avgPace > 0 ? formatPace(avgPace) + '/km' : '—'} icon="⚡" />
            <StatCard label="FC media" value={avgHR > 0 ? Math.round(avgHR) + ' bpm' : '—'} icon="❤️" />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Distanza settimanale</h2>
            <WeeklyChart activities={activities} />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Ultimi allenamenti</h2>
              <Link href="/activities" className="text-sm text-blue-600 hover:underline">
                Tutti →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {activities.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href={`/activities/${a.id}`}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900">{a.name}</div>
                    <div className="text-sm text-gray-400">{formatDate(a.date)}</div>
                  </div>
                  <div className="flex gap-6 text-sm text-right">
                    <div>
                      <div className="font-semibold text-gray-800">{formatDistance(a.distance)}</div>
                      <div className="text-gray-400">distanza</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {a.avgPace ? formatPace(a.avgPace) + '/km' : '—'}
                      </div>
                      <div className="text-gray-400">passo</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {a.avgHeartRate ? Math.round(a.avgHeartRate) + ' bpm' : '—'}
                      </div>
                      <div className="text-gray-400">FC media</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-800 mb-3">Importa altri GPX</h2>
            <GpxUpload onImport={handleImport} />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <div className="text-4xl mb-3">🏃</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Nessun allenamento</h2>
            <p className="text-gray-500 text-sm">Importa file GPX per iniziare</p>
          </div>
          <GpxUpload onImport={handleImport} />
        </div>
      )}
    </div>
  )
}
