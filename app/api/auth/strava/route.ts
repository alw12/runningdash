import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/auth/callback'
  const scope = 'read,activity:read_all'

  const url = new URL('https://www.strava.com/oauth/authorize')
  url.searchParams.set('client_id', clientId!)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('approval_prompt', 'auto')
  url.searchParams.set('scope', scope)

  return NextResponse.redirect(url.toString())
}
