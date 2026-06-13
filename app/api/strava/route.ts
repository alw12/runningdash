import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json()

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'refresh_failed' }, { status: 401 })
  }

  const tokens = await res.json()
  return NextResponse.json(tokens)
}
