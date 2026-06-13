export interface Activity {
  id: string
  name: string
  date: string
  distance: number       // meters
  duration: number       // seconds
  elevationGain: number  // meters
  avgHeartRate?: number
  maxHeartRate?: number
  avgPace?: number       // seconds per km
  type: string
  source: 'strava' | 'gpx'
  stravaId?: number
}

export interface ActivityStream {
  time: number[]
  distance: number[]
  heartrate?: number[]
  velocity?: number[]     // m/s
  altitude?: number[]
  latlng?: [number, number][]
}

export interface StravaTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
    firstname: string
    lastname: string
    profile: string
  }
}
