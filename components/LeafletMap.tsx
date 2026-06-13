'use client'
import { useEffect, useRef } from 'react'

interface LeafletMapProps {
  points: [number, number][]
  height?: number
  className?: string
  interactive?: boolean
}

export function LeafletMap({ points, height = 300, className = '', interactive = true }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current || points.length < 2) return

    let L: typeof import('leaflet')
    let map: import('leaflet').Map

    import('leaflet').then((mod) => {
      L = mod.default ?? mod

      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current) {
        ;(mapRef.current as import('leaflet').Map).remove()
      }

      map = L.map(containerRef.current!, {
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: false,
        doubleClickZoom: interactive,
        touchZoom: interactive,
        keyboard: false,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      const latLngs = points.map(([lat, lon]) => L.latLng(lat, lon))
      const poly = L.polyline(latLngs, {
        color: '#f97316',
        weight: 3,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(map)

      // Start marker
      L.circleMarker(latLngs[0], {
        radius: 6, color: '#fff', weight: 2,
        fillColor: '#22c55e', fillOpacity: 1,
      }).addTo(map)

      // End marker
      L.circleMarker(latLngs[latLngs.length - 1], {
        radius: 6, color: '#fff', weight: 2,
        fillColor: '#ef4444', fillOpacity: 1,
      }).addTo(map)

      if (interactive) {
        L.control.attribution({ position: 'bottomright' }).addTo(map)
      }

      map.fitBounds(poly.getBounds(), { padding: [12, 12] })
      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        ;(mapRef.current as import('leaflet').Map).remove()
        mapRef.current = null
      }
    }
  }, [points, interactive])

  if (points.length < 2) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-xl text-gray-400 text-xs ${className}`}
        style={{ height }}
      >
        No GPS
      </div>
    )
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ height }} className={`rounded-xl overflow-hidden ${className}`} />
    </>
  )
}
