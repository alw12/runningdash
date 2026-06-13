'use client'
import { Suspense } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { saveTokens } from '@/lib/storage'

function AuthSuccessInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const raw = params.get('tokens')
    if (raw) {
      try {
        const tokens = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
        saveTokens(tokens)
      } catch {
        // ignore parse error
      }
    }
    router.replace('/')
  }, [params, router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500">Connessione Strava...</p>
    </div>
  )
}

export default function AuthSuccess() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><p className="text-gray-500">Caricamento...</p></div>}>
      <AuthSuccessInner />
    </Suspense>
  )
}
