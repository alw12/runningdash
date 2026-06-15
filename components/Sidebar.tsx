'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Dashboard', icon: '▦' },
  { href: '/activities', label: 'Allenamenti', icon: '◉' },
  { href: '/routes', label: 'Percorsi', icon: '◎' },
  { href: '/segments', label: 'Segmenti', icon: '◇' },
  { href: '/calculator', label: 'Calcolatore', icon: '◆' },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="d-flex flex-column h-100 w-100">
      <div className="px-3 py-4" style={{ borderBottom: '1px solid #374151' }}>
        <span style={{ color: '#fb923c', fontSize: '1.25rem' }}>⬡</span>
        <span className="text-white fw-bold ms-2 fs-5">RunDash</span>
        {onClose && (
          <button
            onClick={onClose}
            className="btn-close btn-close-white float-end"
            aria-label="Chiudi menu"
          />
        )}
      </div>
      <nav className="flex-grow-1 p-2">
        {NAV.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`nav-link d-flex align-items-center gap-2 mb-1 ${isActive ? 'active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-3" style={{ borderTop: '1px solid #374151' }}>
        <small className="text-secondary">RunDash v1.0</small>
      </div>
    </div>
  )
}
