'use client'

interface RouteMapProps {
  points: [number, number][]
  width?: number
  height?: number
  strokeColor?: string
  strokeWidth?: number
  className?: string
}

export function RouteMap({
  points,
  width = 200,
  height = 150,
  strokeColor = '#f97316',
  strokeWidth = 2,
  className = '',
}: RouteMapProps) {
  if (points.length < 2) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-xs ${className}`}
        style={{ width, height }}
      >
        No GPS
      </div>
    )
  }

  const pad = 8
  const lats = points.map((p) => p[0])
  const lons = points.map((p) => p[1])
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const latRange = maxLat - minLat || 0.0001
  const lonRange = maxLon - minLon || 0.0001

  // Keep aspect ratio
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const scale = Math.min(innerW / lonRange, innerH / latRange)
  const offX = (innerW - lonRange * scale) / 2 + pad
  const offY = (innerH - latRange * scale) / 2 + pad

  const pts = points
    .map(([lat, lon]) => {
      const x = (lon - minLon) * scale + offX
      const y = (maxLat - lat) * scale + offY
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const startPt = points[0]
  const sx = (startPt[1] - minLon) * scale + offX
  const sy = (maxLat - startPt[0]) * scale + offY

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`rounded-lg ${className}`}
      style={{ background: '#f8fafc' }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Start dot */}
      <circle cx={sx.toFixed(1)} cy={sy.toFixed(1)} r="3" fill={strokeColor} />
    </svg>
  )
}
