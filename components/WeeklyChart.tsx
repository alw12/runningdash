'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Activity } from '@/types'
import { format, startOfWeek, addWeeks } from 'date-fns'
import { it } from 'date-fns/locale'

interface WeeklyChartProps {
  activities: Activity[]
}

export function WeeklyChart({ activities }: WeeklyChartProps) {
  if (activities.length === 0) return null

  const dates = activities.map((a) => new Date(a.date))
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  const weeks: Record<string, number> = {}
  let cur = startOfWeek(minDate, { weekStartsOn: 1 })
  while (cur <= maxDate) {
    const key = format(cur, 'dd MMM', { locale: it })
    weeks[key] = 0
    cur = addWeeks(cur, 1)
  }

  activities.forEach((a) => {
    const week = startOfWeek(new Date(a.date), { weekStartsOn: 1 })
    const key = format(week, 'dd MMM', { locale: it })
    weeks[key] = (weeks[key] ?? 0) + a.distance / 1000
  })

  const data = Object.entries(weeks)
    .slice(-12)
    .map(([week, km]) => ({ week, km: parseFloat(km.toFixed(1)) }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} unit=" km" />
        <Tooltip formatter={(v) => [String(v) + ' km', 'Distanza']} />
        <Bar dataKey="km" fill="var(--rd-distance)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
