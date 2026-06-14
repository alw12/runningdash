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
  shoe?: string
  label?: string
}

export interface ActivityStream {
  time: number[]
  distance: number[]
  heartrate?: number[]
  velocity?: number[]    // m/s
  altitude?: number[]
  latlng?: [number, number][]
}

export interface Shoe {
  id: string
  brand: string
  model: string
  displayName: string
  maxKm?: number
}
