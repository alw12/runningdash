'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/', label: 'Dashboard', icon: '▦' },
  { href: '/activities', label: 'Allenamenti', icon: '◉' },
  { href: '/shoes', label: 'Scarpe', icon: '◈' },
]

export function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-56 bg-gray-900 flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-orange-400 text-xl">⬡</span>
          <span className="text-white font-bold text-lg tracking-tight">RunDash</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = item.href === '/' ? path === '/' : path.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-600">RunDash v1.0</p>
      </div>
    </aside>
  )
}
