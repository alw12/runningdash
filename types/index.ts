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
}

export interface ActivityStream {
  time: number[]
  distance: number[]
  heartrate?: number[]
  velocity?: number[]    // m/s
  altitude?: number[]
  latlng?: [number, number][]
}
