import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Running Dashboard',
  description: 'Analisi allenamenti di corsa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-8 shadow-sm">
          <Link href="/" className="font-bold text-lg text-blue-600 flex items-center gap-2">
            🏃 RunDash
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <Link href="/activities" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
            Allenamenti
          </Link>
        </nav>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
