'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Map of pathnames to breadcrumb trails.
// Each entry is an array of { label, href? } — last item has no href (it's the current page).
// For dynamic routes like /activities/[id], the label will be generic ("Dettaglio").
// The developer should enhance this with actual entity names via a context or prop.
function useBreadcrumbs(): { label: string; href?: string }[] {
  const pathname = usePathname()

  if (pathname === '/') {
    return [{ label: 'Dashboard' }]
  }
  if (pathname === '/activities') {
    return [
      { label: 'Dashboard', href: '/' },
      { label: 'Allenamenti' },
    ]
  }
  if (pathname.startsWith('/activities/')) {
    return [
      { label: 'Dashboard', href: '/' },
      { label: 'Allenamenti', href: '/activities' },
      { label: 'Dettaglio' },
    ]
  }
  if (pathname === '/routes') {
    return [
      { label: 'Dashboard', href: '/' },
      { label: 'Percorsi' },
    ]
  }
  if (pathname.startsWith('/routes/')) {
    return [
      { label: 'Dashboard', href: '/' },
      { label: 'Percorsi', href: '/routes' },
      { label: 'Dettaglio' },
    ]
  }
  if (pathname === '/segments') {
    return [
      { label: 'Dashboard', href: '/' },
      { label: 'Segmenti' },
    ]
  }
  if (pathname === '/calculator') {
    return [
      { label: 'Dashboard', href: '/' },
      { label: 'Calcolatore' },
    ]
  }
  if (pathname === '/shoes') {
    return [
      { label: 'Dashboard', href: '/' },
      { label: 'Scarpe' },
    ]
  }

  return [{ label: 'RunDash' }]
}

export function Topbar() {
  const breadcrumbs = useBreadcrumbs()

  return (
    <header className="rd-topbar">
      {/* Logo — mobile only (desktop logo lives in the rail) */}
      <Link
        href="/"
        className="rd-topbar-brand d-md-none"
        aria-label="RunDash — torna alla dashboard"
      >
        <span className="rd-topbar-brand-accent" aria-hidden="true">⬡</span>
        RunDash
      </Link>

      {/* Breadcrumb — desktop only (mobile sees just the logo) */}
      <nav
        className="rd-breadcrumb d-none d-md-flex"
        aria-label="Breadcrumb"
      >
        {breadcrumbs.map((crumb, i) => {
          const isLast = i === breadcrumbs.length - 1
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && (
                <span className="rd-topbar-sep" aria-hidden="true">/</span>
              )}
              {isLast || !crumb.href ? (
                <span
                  className="rd-breadcrumb-current"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="rd-breadcrumb a">
                  {crumb.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

      {/* Right slot — reserved for page-level actions (e.g. "+ Importa" button) */}
      {/* The page itself renders action buttons; the topbar right side is empty by default.
          Developer: to hoist the import button here, lift state to a context or use a portal. */}
      <div style={{ marginLeft: 'auto' }} />
    </header>
  )
}
