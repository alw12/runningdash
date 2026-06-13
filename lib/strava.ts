import { Activity, ActivityStream, StravaTokens } from '@/types'

const STRAVA_BASE = 'https://www.strava.com/api/v3'

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
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
  if (!res.ok) throw new Error('Failed to refresh Strava token')
  return res.json()
}

export function mapStravaActivity(raw: Record<string, unknown>): Activity {
  const distance = raw.distance as number
  const duration = raw.moving_time as number
  const avgSpeed = raw.average_speed as number | undefined

  return {
    id: String(raw.id),
    stravaId: raw.id as number,
    name: raw.name as string,
    date: raw.start_date as string,
    distance,
    duration,
    elevationGain: (raw.total_elevation_gain as number) ?? 0,
    avgHeartRate: raw.average_heartrate as number | undefined,
    maxHeartRate: raw.max_heartrate as number | undefined,
    avgPace: avgSpeed && avgSpeed > 0 ? 1000 / avgSpeed : undefined,
    type: raw.type as string,
    source: 'strava',
  }
}

export async function fetchStravaActivities(
  accessToken: string,
  page = 1,
  perPage = 30
): Promise<Activity[]> {
  const res = await fetch(
    `${STRAVA_BASE}/athlete/activities?page=${page}&per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error('Failed to fetch activities')
  const data: Record<string, unknown>[] = await res.json()
  return data
    .filter((a) => (a.type as string) === 'Run')
    .map(mapStravaActivity)
}

export async function fetchStravaActivityStreams(
  accessToken: string,
  activityId: number
): Promise<ActivityStream> {
  const keys = 'time,distance,heartrate,velocity_smooth,altitude,latlng'
  const res = await fetch(
    `${STRAVA_BASE}/activities/${activityId}/streams?keys=${keys}&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error('Failed to fetch streams')
  const data = await res.json()

  return {
    time: data.time?.data ?? [],
    distance: data.distance?.data ?? [],
    heartrate: data.heartrate?.data,
    velocity: data.velocity_smooth?.data,
    altitude: data.altitude?.data,
    latlng: data.latlng?.data,
  }
}
