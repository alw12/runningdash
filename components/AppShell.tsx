'use client'

import { usePathname } from 'next/navigation'
import { RailNav } from './RailNav'
import { BottomTabBar } from './BottomTabBar'
import { Topbar } from './Topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
      {/* Navigation rail — desktop only (md+) */}
      <div className="d-none d-md-flex">
        <RailNav />
      </div>

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar />
        <main className="rd-main-content" style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <div className="d-md-none">
        <BottomTabBar />
      </div>
    </div>
  )
}
