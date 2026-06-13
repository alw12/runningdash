'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatPace } from '@/lib/utils'

interface ChartPoint {
  dist: number
  hr?: number
  pace?: number
  alt?: number
}

interface ActivityChartProps {
  data: ChartPoint[]
  showHR?: boolean
  showPace?: boolean
  showAlt?: boolean
}

function PaceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow">
      {payload.map((p) => (
        <div key={p.name}>
          <span className="font-medium">{p.name}: </span>
          {p.name === 'Passo' ? formatPace(p.value) + '/km' : p.value}
        </div>
      ))}
    </div>
  )
}

export function ActivityChart({ data, showHR = true, showPace = true, showAlt = false }: ActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="dist"
          tickFormatter={(v) => (v / 1000).toFixed(1) + ' km'}
          tick={{ fontSize: 11 }}
        />
        <YAxis yAxisId="hr" hide={!showHR} domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="pace" orientation="right" hide={!showPace} tickFormatter={formatPace} tick={{ fontSize: 11 }} />
        <YAxis yAxisId="alt" hide={!showAlt} tick={{ fontSize: 11 }} />
        <Tooltip content={<PaceTooltip />} />
        <Legend />
        {showHR && (
          <Line
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            name="FC (bpm)"
            stroke="#ef4444"
            dot={false}
            strokeWidth={1.5}
          />
        )}
        {showPace && (
          <Line
            yAxisId="pace"
            type="monotone"
            dataKey="pace"
            name="Passo"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={1.5}
          />
        )}
        {showAlt && (
          <Line
            yAxisId="alt"
            type="monotone"
            dataKey="alt"
            name="Quota (m)"
            stroke="#22c55e"
            dot={false}
            strokeWidth={1.5}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
