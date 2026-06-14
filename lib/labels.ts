export const LABEL_STYLES: Record<string, { bg: string; text: string }> = {
  'Gara':        { bg: 'bg-red-100',    text: 'text-red-600' },
  'Fondo lento': { bg: 'bg-green-100',  text: 'text-green-700' },
  'Interval':    { bg: 'bg-purple-100', text: 'text-purple-700' },
  'Recupero':    { bg: 'bg-gray-100',   text: 'text-gray-600' },
  'Long run':    { bg: 'bg-orange-100', text: 'text-orange-600' },
}

export const LABELS = ['Gara', 'Fondo lento', 'Interval', 'Recupero', 'Long run'] as const
export type ActivityLabel = typeof LABELS[number]
