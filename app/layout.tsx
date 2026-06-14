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
      <body style={{ margin: 0, minHeight: '100vh' }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
