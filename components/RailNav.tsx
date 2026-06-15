'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// SVG icons — inline for zero-dependency, consistent sizing.
// Each icon is a 20×20 viewBox, stroked at 1.5px to match a "medium weight" optical feel.
function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1.5" />
      <rect x="12" y="2" width="6" height="6" rx="1.5" />
      <rect x="2" y="12" width="6" height="6" rx="1.5" />
      <rect x="12" y="12" width="6" height="6" rx="1.5" />
    </svg>
  )
}

function IconActivities() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="2,10 5,5 8,13 11,7 14,10 18,10" />
    </svg>
  )
}

function IconRoutes() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="5" r="2" />
      <circle cx="15" cy="15" r="2" />
      <path d="M7 5h4a3 3 0 0 1 3 3v4" />
    </svg>
  )
}

function IconSegments() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="10" x2="7" y2="6" />
      <line x1="17" y1="10" x2="13" y2="14" />
    </svg>
  )
}

function IconCalculator() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="12" height="16" rx="2" />
      <rect x="7" y="5" width="6" height="3" rx="0.5" />
      <line x1="7" y1="11" x2="7" y2="11" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="11" x2="10" y2="11" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="11" x2="13" y2="11" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="14" x2="7" y2="14" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="14" x2="10" y2="14" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="14" x2="13" y2="14" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const NAV = [
  { href: '/',            label: 'Dashboard',   Icon: IconDashboard   },
  { href: '/activities',  label: 'Allenamenti', Icon: IconActivities  },
  { href: '/routes',      label: 'Percorsi',    Icon: IconRoutes      },
  { href: '/segments',    label: 'Segmenti',    Icon: IconSegments    },
  { href: '/calculator',  label: 'Calcolatore', Icon: IconCalculator  },
]

interface RailNavProps {
  mobile?: boolean
  onClose?: () => void
}

export function RailNav({ mobile = false, onClose }: RailNavProps) {
  const pathname = usePathname()

  if (mobile) {
    // Offcanvas layout: icon + label side by side, full-width items
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* Logo row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '1rem',
            marginBottom: '0.5rem',
            borderBottom: '1px solid var(--rd-sidebar-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--rd-brand)', fontSize: '1.4rem', lineHeight: 1 }}>⬡</span>
            <span style={{ color: 'var(--rd-text-primary)', fontWeight: 700, fontSize: '1rem' }}>RunDash</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Chiudi menu"
              style={{
                background: 'transparent',
                border: '1px solid var(--rd-card-border)',
                borderRadius: 'var(--rd-radius-sm)',
                color: 'var(--rd-text-secondary)',
                width: 32,
                height: 32,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav aria-label="Navigazione principale">
          {NAV.map(({ href, label, Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={isActive ? 'page' : undefined}
                className={`rd-rail-item${isActive ? ' active' : ''}`}
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 'var(--rd-radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: 12,
                  padding: '0 12px',
                  marginBottom: 2,
                  textDecoration: 'none',
                  color: isActive ? 'var(--rd-brand)' : 'var(--rd-text-secondary)',
                  background: isActive ? 'var(--rd-sidebar-active)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 'var(--rd-font-size-base)',
                  transition: 'color 0.15s ease, background 0.15s ease',
                }}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '1rem',
            borderTop: '1px solid var(--rd-sidebar-border)',
          }}
        >
          <small style={{ color: 'var(--rd-text-muted)', fontSize: 'var(--rd-font-size-xs)' }}>
            RunDash v1.0
          </small>
        </div>
      </div>
    )
  }

  // Desktop rail: 64px wide, icon-only with floating tooltip
  return (
    <div
      className="rd-rail"
      role="navigation"
      aria-label="Navigazione principale"
    >
      {/* Logo */}
      <div className="rd-rail-logo" aria-hidden="true">
        <span style={{ color: 'var(--rd-brand)', fontSize: '1.4rem', lineHeight: 1 }}>⬡</span>
      </div>

      {/* Nav items */}
      <div className="rd-rail-nav">
        {NAV.map(({ href, label, Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className={`rd-rail-item${isActive ? ' active' : ''}`}
            >
              <Icon />
              {/* Tooltip shown on hover via CSS */}
              <span className="rd-rail-tooltip" aria-hidden="true">{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
