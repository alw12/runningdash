'use client'
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { formatPace } from '@/lib/utils'

interface ChartPoint {
  dist: number
  hr?: number
  pace?: number
  alt?: number
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: number
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--rd-sidebar-bg)',
      color: '#fff',
      borderRadius: 'var(--rd-radius-md)',
      padding: '8px 12px',
      fontSize: 'var(--rd-font-size-sm)',
      boxShadow: 'var(--rd-shadow-md)',
      border: '1px solid var(--rd-sidebar-border)',
    }}>
      <p style={{ color: 'var(--rd-text-muted)', margin: '0 0 6px', fontWeight: 500 }}>
        {((label ?? 0) / 1000).toFixed(2)} km
      </p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ color: '#d1d5db' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>
            {p.name === 'Passo' ? formatPace(p.value) + '/km'
             : p.name === 'FC' ? Math.round(p.value) + ' bpm'
             : Math.round(p.value) + ' m'}
          </span>
        </div>
      ))}
    </div>
  )
}

interface ActivityChartProps {
  data: ChartPoint[]
  showHR?: boolean
  showPace?: boolean
  showAlt?: boolean
}

export function ActivityChart({ data, showHR = true, showPace = true, showAlt = false }: ActivityChartProps) {
  const avgHR = showHR && data.some(d => d.hr)
    ? data.filter(d => d.hr).reduce((s, d) => s + (d.hr ?? 0), 0) / data.filter(d => d.hr).length
    : null
  const avgPace = showPace && data.some(d => d.pace)
    ? data.filter(d => d.pace).reduce((s, d) => s + (d.pace ?? 0), 0) / data.filter(d => d.pace).length
    : null

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

        <XAxis
          dataKey="dist"
          tickFormatter={(v) => (v / 1000).toFixed(1) + ' km'}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />

        {showHR && (
          <YAxis
            yAxisId="hr"
            domain={['dataMin - 10', 'dataMax + 10']}
            tick={{ fontSize: 11, fill: '#ef4444' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
        )}
        {showPace && (
          <YAxis
            yAxisId="pace"
            orientation="right"
            domain={['dataMin - 30', 'dataMax + 30']}
            tickFormatter={formatPace}
            tick={{ fontSize: 11, fill: '#3b82f6' }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
        )}
        {showAlt && (
          <YAxis
            yAxisId="alt"
            tick={{ fontSize: 11, fill: '#22c55e' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
        )}

        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(value) => <span style={{ color: '#64748b' }}>{value}</span>}
        />

        {showHR && avgHR && (
          <ReferenceLine
            yAxisId="hr"
            y={avgHR}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
        )}
        {showPace && avgPace && (
          <ReferenceLine
            yAxisId="pace"
            y={avgPace}
            stroke="#3b82f6"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
        )}

        {showAlt && (
          <Area
            yAxisId="alt"
            type="monotone"
            dataKey="alt"
            name="Quota"
            stroke="#22c55e"
            strokeWidth={1.5}
            fill="url(#altGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e' }}
          />
        )}
        {showHR && (
          <Area
            yAxisId="hr"
            type="monotone"
            dataKey="hr"
            name="FC"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#hrGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444' }}
          />
        )}
        {showPace && (
          <Line
            yAxisId="pace"
            type="monotone"
            dataKey="pace"
            name="Passo"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
