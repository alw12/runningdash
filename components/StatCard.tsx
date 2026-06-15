'use client'

export type StatCardVariant = 'orange' | 'green' | 'red' | 'blue' | 'neutral'

export interface TrendData {
  value: number
  unit: string
  label?: string
}

export interface StatCardProps {
  label: string
  value: string
  sub?: string
  trend?: TrendData
  variant?: StatCardVariant
  loading?: boolean
  valueA11y?: string
}

const VARIANT_MAP: Record<StatCardVariant, { bg: string; border: string }> = {
  orange:  { bg: 'var(--rd-tint-orange)', border: 'var(--rd-brand-border)' },
  green:   { bg: 'var(--rd-tint-green)',  border: '#bbf7d0' },
  red:     { bg: 'var(--rd-tint-red)',    border: '#fecdd3' },
  blue:    { bg: 'var(--rd-tint-blue)',   border: '#bfdbfe' },
  neutral: { bg: '#ffffff',              border: 'var(--rd-card-border)' },
}

function TrendIndicator({ trend }: { trend: TrendData }) {
  const isUp   = trend.value > 0
  const isFlat = Math.abs(trend.value) < 0.05
  const meta   = trend.label ?? 'vs sett. prec.'
  const sign   = isUp ? '+' : ''
  const color  = isFlat ? 'var(--rd-text-muted)' : isUp ? 'var(--rd-success)' : 'var(--rd-danger)'
  const arrow  = isFlat ? '→' : isUp ? '↑' : '↓'

  return (
    <span
      className="d-flex align-items-center gap-1 mt-1"
      style={{ fontSize: 'var(--rd-font-size-xs)', color, fontWeight: 500 }}
      aria-label={`${isFlat ? 'Invariato' : isUp ? 'Aumento di' : 'Diminuzione di'} ${Math.abs(trend.value).toFixed(1)} ${trend.unit} ${meta}`}
    >
      <span aria-hidden="true">{arrow}</span>
      <span>
        {isFlat
          ? `invariato ${meta}`
          : `${sign}${trend.value.toFixed(1)} ${trend.unit} ${meta}`}
      </span>
    </span>
  )
}

function SkeletonPulse({ width = '60%', height = '1.5rem' }: { width?: string; height?: string }) {
  return (
    <span
      className="d-inline-block rounded"
      style={{
        width,
        height,
        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
        animation: 'rd-shimmer 1.4s infinite',
        verticalAlign: 'middle',
      }}
      aria-hidden="true"
    />
  )
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  variant = 'neutral',
  loading = false,
  valueA11y,
}: StatCardProps) {
  const v = VARIANT_MAP[variant]

  return (
    <article
      className="card h-100 border"
      aria-busy={loading}
      aria-label={`${label}: ${valueA11y ?? value}${sub ? '. ' + sub : ''}`}
      style={{
        background: v.bg,
        borderColor: v.border,
        borderRadius: 'var(--rd-radius-md)',
        boxShadow: 'var(--rd-shadow-card)',
      }}
    >
      <div className="card-body p-3">
        <p
          className="mb-1 text-uppercase fw-semibold"
          aria-hidden="true"
          style={{
            fontSize: 'var(--rd-font-size-xs)',
            letterSpacing: '0.06em',
            color: 'var(--rd-text-secondary)',
            lineHeight: 1.2,
          }}
        >
          {label}
        </p>

        {loading ? (
          <SkeletonPulse width="55%" height="1.75rem" />
        ) : (
          <p
            className="mb-0 fw-bold"
            aria-hidden={Boolean(valueA11y)}
            style={{
              fontSize: 'var(--rd-font-size-stat)',
              color: 'var(--rd-text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            {value}
          </p>
        )}

        {!loading && sub && (
          <p
            className="mb-0"
            style={{ fontSize: 'var(--rd-font-size-xs)', color: 'var(--rd-text-muted)', marginTop: '2px' }}
          >
            {sub}
          </p>
        )}

        {!loading && trend && <TrendIndicator trend={trend} />}
      </div>
    </article>
  )
}
