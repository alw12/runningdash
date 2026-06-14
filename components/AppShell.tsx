'use client'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  if (path === '/onboarding') {
    return <>{children}</>
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </>
  )
}
