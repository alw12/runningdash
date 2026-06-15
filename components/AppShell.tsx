'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { RailNav } from './RailNav'
import { BottomTabBar } from './BottomTabBar'
import { Topbar } from './Topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Onboarding: render solo children senza layout
  if (pathname === '/onboarding') {
    return <>{children}</>
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--rd-page-bg)',
      }}
    >
      {/* ── Navigation rail — desktop only (md+) ── */}
      <div className="d-none d-md-flex">
        <RailNav />
      </div>

      {/* ── Main column: topbar + content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Topbar — always visible */}
        <Topbar onHamburger={() => setMobileOpen(true)} />

        {/* Page content */}
        <main className="rd-main-content" style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </main>
      </div>

      {/* ── Mobile offcanvas overlay ── */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              zIndex: 1049,
            }}
          />
          <div
            className="offcanvas-nav position-fixed top-0 start-0 h-100 p-3"
            style={{ zIndex: 1050 }}
          >
            <RailNav mobile onClose={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* ── Bottom tab bar — mobile only (<md) ── */}
      <div className="d-md-none">
        <BottomTabBar />
      </div>
    </div>
  )
}
