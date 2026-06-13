import { Activity, Shoe } from '@/types'

const IT_MONTHS: Record<string, string> = {
  gen: '01', feb: '02', mar: '03', apr: '04', mag: '05', giu: '06',
  lug: '07', ago: '08', set: '09', ott: '10', nov: '11', dic: '12',
}

function parseItalianDate(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4}),?\s+(\d{2}:\d{2}:\d{2})$/i)
  if (!m) return new Date(raw).toISOString()
  const [, day, mon, year, time] = m
  const month = IT_MONTHS[mon.toLowerCase()] ?? '01'
  return `${year}-${month}-${day.padStart(2, '0')}T${time}Z`
}

function num(v: string | undefined): number {
  const n = parseFloat((v ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []

  function parseLine(line: string): string[] {
    const fields: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { fields.push(cur); cur = '' }
      else { cur += ch }
    }
    fields.push(cur)
    return fields
  }

  const headers = parseLine(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i])
    if (vals.length < 3) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] ?? '').trim() })
    rows.push(row)
  }
  return rows
}

export function parseStravaExportCSV(csvText: string): Activity[] {
  const rows = parseCSV(csvText)
  const activities: Activity[] = []

  for (const row of rows) {
    const type = row['Tipo attività'] ?? ''
    if (!type.includes('Corsa') && !type.includes('Run')) continue

    const dateKey = Object.keys(row).find((k) => k.includes('Data dell'))
    const dateRaw = dateKey ? row[dateKey] : ''
    const distance = num(row['Distanza'])
    const duration = num(row['Tempo trascorso'])
    const avgSpeedMs = num(row['Velocità media'])
    const elevGain = num(row['Dislivello positivo'])
    const avgHR = num(row['Frequenza cardiaca media']) || undefined
    const maxHR = num(row['Frequenza cardiaca massima']) || undefined
    const shoe = row['Attrezzatura attività']?.trim() || undefined
    const stravaId = row['ID attività'] ?? ''

    if (distance === 0 || duration === 0) continue

    const avgPace = avgSpeedMs > 0 ? 1000 / avgSpeedMs : undefined
    const date = dateRaw ? parseItalianDate(dateRaw) : new Date().toISOString()
    const id = `strava-csv-${stravaId || date}`

    activities.push({
      id,
      name: row['Nome attività'] || 'Corsa',
      date,
      distance,
      duration,
      elevationGain: elevGain,
      avgHeartRate: avgHR,
      maxHeartRate: maxHR,
      avgPace,
      type: 'Run',
      shoe,
    })
  }

  return activities
}

export function parseShoesCSV(csvText: string): Shoe[] {
  const rows = parseCSV(csvText)
  const shoes: Shoe[] = []

  rows.forEach((row, i) => {
    const brand = row['Marca delle scarpe']?.trim()
    const model = row['Modello delle scarpe']?.trim()
    if (!brand && !model) return
    const displayName = row['Nome delle scarpe']?.trim() || [brand, model].filter(Boolean).join(' ')
    shoes.push({
      id: `shoe-${i}`,
      brand: brand ?? '',
      model: model ?? '',
      displayName,
    })
  })

  return shoes
}
