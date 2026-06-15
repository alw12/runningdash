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

// On the dark theme, instead of tinted backgrounds (too subtle) we use:
// - a card with var(--rd-card-bg) surface
// - a 3px left border in the variant color for immediate visual scanning
// - the value number rendered in the variant color
const VARIANT_MAP: Record<StatCardVariant, { borderColor: string; valueColor: string }> = {
  orange:  { borderColor: 'var(--rd-brand)',     valueColor: 'var(--rd-brand)'     },
  green:   { borderColor: 'var(--rd-elevation)', valueColor: 'var(--rd-elevation)' },
  red:     { borderColor: 'var(--rd-hr)',         valueColor: 'var(--rd-hr)'        },
  blue:    { borderColor: 'var(--rd-pace)',        valueColor: 'var(--rd-pace)'      },
  neutral: { borderColor: 'var(--rd-card-border)', valueColor: 'var(--rd-text-primary)' },
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
      className="d-inline-block rounded rd-skeleton"
      style={{
        width,
        height,
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
      className="card h-100"
      aria-busy={loading}
      aria-label={`${label}: ${valueA11y ?? value}${sub ? '. ' + sub : ''}`}
      style={{
        background: 'var(--rd-card-bg)',
        borderColor: 'var(--rd-card-border)',
        borderRadius: 'var(--rd-radius-md)',
        borderLeft: `3px solid ${v.borderColor}`,
        boxShadow: 'none',
      }}
    >
      <div className="card-body p-3">
        <p
          className="mb-1 text-uppercase fw-semibold"
          aria-hidden="true"
          style={{
            fontSize: 'var(--rd-font-size-xs)',
            letterSpacing: '0.07em',
            color: 'var(--rd-text-muted)',
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
              color: v.valueColor,
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
          </p>
        )}

        {!loading && sub && (
          <p
            className="mb-0"
            style={{
              fontSize: 'var(--rd-font-size-xs)',
              color: 'var(--rd-text-muted)',
              marginTop: '3px',
            }}
          >
            {sub}
          </p>
        )}

        {!loading && trend && <TrendIndicator trend={trend} />}
      </div>
    </article>
  )
}
