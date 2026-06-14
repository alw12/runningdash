/**
 * Pace calculator based on anthropometric data.
 *
 * Pipeline:
 *  1. BMI from height + weight
 *  2. Estimated VO2max from BMI + optional gender
 *     (Heil 2002 regression for recreational runners, adjusted for height)
 *  3. vVO2max (velocity at VO2max) from Léger & Mercier formula
 *  4. Training zones from vVO2max using Daniels percentages
 *
 * References:
 *  - Heil (2002): VO2max prediction from BMI in recreational athletes
 *  - Daniels (2005): Running Formula — zone percentages of vVO2max
 *  - Léger & Mercier (1983): vVO2max ≈ (VO2max − 3.5) / 0.2  m/min
 */

export interface PaceZone {
  name: string
  description: string
  paceMin: number  // seconds/km lower bound
  paceMax: number  // seconds/km upper bound
  color: string
  effort: string
}

export interface PaceResult {
  bmi: number
  bmiCategory: string
  estimatedVO2max: number
  vVO2maxPace: number      // s/km at 100% VO2max
  zones: PaceZone[]
  heightAdjustment: number // %
  weightPenalty: number    // s/km added due to excess weight
}

// Daniels zone percentages of vVO2max (as fraction)
// Higher % = faster pace = lower pace number
const ZONE_DEFS = [
  {
    name: 'Recupero',
    description: 'Corsa lenta di recupero. Respiro facile, conversazione normale.',
    lo: 0.59, hi: 0.65,
    color: '#22c55e',
    effort: 'Facilissimo',
  },
  {
    name: 'Aerobico',
    description: 'Base aerobica. Puoi parlare in frasi brevi. Il passo giusto per allenarti quotidianamente.',
    lo: 0.65, hi: 0.74,
    color: '#3b82f6',
    effort: 'Facile',
  },
  {
    name: 'Soglia (Tempo)',
    description: 'Soglia del lattato. Respiro controllato ma impegnato. Ideale 20-40 min.',
    lo: 0.83, hi: 0.88,
    color: '#f97316',
    effort: 'Moderato-alto',
  },
  {
    name: 'VO₂max',
    description: 'Intensità massima. Circa 5-8 min. Non si parla. Ripetute o gare brevi.',
    lo: 0.95, hi: 1.00,
    color: '#ef4444',
    effort: 'Massimo',
  },
]

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Sottopeso'
  if (bmi < 25) return 'Normopeso'
  if (bmi < 30) return 'Sovrappeso'
  return 'Obeso'
}

/**
 * Estimate VO2max from BMI and gender.
 *
 * Base formula (Heil 2002 simplified):
 *   VO2max_men   = 60.9 − 1.77 × BMI
 *   VO2max_women = 54.9 − 1.77 × BMI
 *
 * Height adjustment: taller runners have mechanically longer strides
 * and slightly higher metabolic efficiency.
 * Empirical: +0.3 ml/kg/min per cm above 170 cm (men), 160 cm (women).
 */
function estimateVO2max(
  bmi: number,
  heightCm: number,
  gender: 'm' | 'f'
): { vo2max: number; heightAdj: number } {
  const base = gender === 'm'
    ? 60.9 - 1.77 * bmi
    : 54.9 - 1.77 * bmi

  const refHeight = gender === 'm' ? 170 : 160
  const heightAdj = (heightCm - refHeight) * 0.3
  const vo2max = Math.max(20, Math.min(75, base + heightAdj))

  return { vo2max, heightAdj }
}

/**
 * vVO2max (m/min) from Léger & Mercier:
 *   v = (VO2max − 3.5) / 0.2   [m/min]
 *
 * Weight penalty: each kg above lean body mass (estimated as BMI 22 × height²)
 * costs ~2.5 s/km on pace. This is separate from VO2max (which is per kg, so
 * weight is already baked in via BMI); here we add a biomechanical penalty for
 * carrying excess mass on the skeleton/joints.
 */
function vVO2maxToPace(vo2max: number, weightKg: number, heightM: number): { pace: number; penalty: number } {
  const vMs = ((vo2max - 3.5) / 0.2) / 60  // m/s
  const basePace = 1000 / vMs               // s/km

  const leanWeight = 22 * heightM * heightM
  const excessKg = Math.max(0, weightKg - leanWeight)
  const penalty = excessKg * 2.5            // s/km

  return { pace: basePace + penalty, penalty }
}

export function calculatePaceZones(
  heightCm: number,
  weightKg: number,
  gender: 'f' | 'm' = 'm'
): PaceResult {
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  const { vo2max, heightAdj } = estimateVO2max(bmi, heightCm, gender)
  const { pace: vVO2maxPace, penalty } = vVO2maxToPace(vo2max, weightKg, heightM)

  const zones: PaceZone[] = ZONE_DEFS.map((z) => ({
    name: z.name,
    description: z.description,
    color: z.color,
    effort: z.effort,
    // lo% of vVO2max → fastest in zone → lowest pace number
    // hi% of vVO2max → slowest in zone → highest pace number
    paceMin: vVO2maxPace / z.hi,
    paceMax: vVO2maxPace / z.lo,
  }))

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory: bmiCategory(bmi),
    estimatedVO2max: Math.round(vo2max * 10) / 10,
    vVO2maxPace: Math.round(vVO2maxPace),
    zones,
    heightAdjustment: Math.round(heightAdj * 10) / 10,
    weightPenalty: Math.round(penalty),
  }
}
