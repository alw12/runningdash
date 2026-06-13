import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', req.url))
  }

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    return NextResponse.redirect(new URL('/?error=token_exchange', req.url))
  }

  const tokens = await res.json()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Pass tokens to client via query param (short-lived redirect)
  const redirect = new URL('/auth/success', appUrl)
  redirect.searchParams.set('tokens', Buffer.from(JSON.stringify(tokens)).toString('base64'))

  return NextResponse.redirect(redirect.toString())
}
