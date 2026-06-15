'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function IconDashboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1.5" />
      <rect x="12" y="2" width="6" height="6" rx="1.5" />
      <rect x="2" y="12" width="6" height="6" rx="1.5" />
      <rect x="12" y="12" width="6" height="6" rx="1.5" />
    </svg>
  )
}

function IconActivities() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="2,10 5,5 8,13 11,7 14,10 18,10" />
    </svg>
  )
}

function IconRoutes() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="5" r="2" />
      <circle cx="15" cy="15" r="2" />
      <path d="M7 5h4a3 3 0 0 1 3 3v4" />
    </svg>
  )
}

function IconSegments() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="10" x2="7" y2="6" />
      <line x1="17" y1="10" x2="13" y2="14" />
    </svg>
  )
}

function IconCalculator() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

const TABS = [
  { href: '/',           label: 'Home',      Icon: IconDashboard   },
  { href: '/activities', label: 'Allena.',   Icon: IconActivities  },
  { href: '/routes',     label: 'Percorsi',  Icon: IconRoutes      },
  { href: '/segments',   label: 'Segmenti',  Icon: IconSegments    },
  { href: '/calculator', label: 'Calc.',     Icon: IconCalculator  },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="rd-tabbar" aria-label="Navigazione principale">
      {TABS.map(({ href, label, Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`rd-tab-item${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
          >
            <Icon />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
