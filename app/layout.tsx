import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/AppShell'

export const metadata: Metadata = {
  title: 'RunDash',
  description: 'Dashboard allenamenti di corsa',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="flex h-screen bg-gray-50 overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
