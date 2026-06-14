'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Onboarding: render solo children senza layout
  if (pathname === '/onboarding') {
    return <>{children}</>
  }

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar desktop - visibile solo md+ */}
      <div className="sidebar d-none d-md-flex flex-column">
        <Sidebar />
      </div>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1049,
          }}
        />
      )}

      {/* Offcanvas mobile nav */}
      {mobileOpen && (
        <div
          className="offcanvas-nav position-fixed top-0 start-0 h-100 p-3"
          style={{ zIndex: 1050 }}
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-grow-1 d-flex flex-column overflow-auto">
        {/* Mobile topbar */}
        <div className="mobile-topbar d-flex d-md-none align-items-center px-3 py-2 sticky-top">
          <button
            type="button"
            className="btn btn-sm text-white me-3"
            style={{ border: 'none', background: 'transparent', fontSize: '1.4rem' }}
            onClick={() => setMobileOpen(true)}
            aria-label="Apri menu"
          >
            ☰
          </button>
          <span style={{ color: '#fb923c', fontSize: '1.1rem' }}>⬡</span>
          <span className="text-white fw-bold ms-2">RunDash</span>
        </div>

        {/* Page content */}
        <main className="flex-grow-1 p-3 p-md-4" style={{ background: '#f9fafb' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
