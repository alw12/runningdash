/**
 * Pace calculator — algoritmo aggiornato.
 *
 * Metodi di stima VO2max supportati:
 *
 * 1. ANTHROPOMETRIC (fallback): Heil 2002 semplificato (BMI-based).
 *    Solo se non si hanno dati migliori.
 *
 * 2. PACE-BASED (preferito): Equazione Daniels & Gilbert inversa.
 *    Input: passo medio di corsa facile dell'utente (s/km).
 *    Il passo facile dell'utente corrisponde a circa 65-75% vVO2max.
 *    Usiamo 70% come valore centrale.
 *    Formula:
 *      vVO2max [m/s] = (1000 / referencePace) / 0.70
 *      VO2cost [ml/kg/min] = vVO2max [m/min] * 0.2 + 3.5   (Léger & Mercier)
 *      VO2max ≈ VO2cost / 0.65  (efficienza media runner amatoriale)
 *    In pratica:
 *      vVO2maxMs = (1000 / referencePaceSeconds) / 0.70
 *      VO2max = (vVO2maxMs * 60 * 0.2 + 3.5) / 0.65
 *    Clamped [18, 80].
 *
 * 3. HR-BASED: da FC max usando formula Uth et al. (2004):
 *    VO2max = 15 * (HRmax / HRrest)
 *    Poiche' non abbiamo HRrest, usiamo una stima conservativa:
 *    HRrest_estimated = 220 - age ~ uso 65 bpm come default.
 *    Oppure, piu' semplice e pratico per questo contesto:
 *    Formula lineare HRmax-based per amatori (Londeree & Moeschberger 1982):
 *    VO2max_approx = (HRmax - 72) * 0.6   — produce ~40-50 per 185-200 bpm
 *    Clamped [18, 80].
 *
 * Composizione corporea:
 *    Se BMI > 30 e bodyFatPct e' fornito:
 *      - Calcola lean body mass: LBM = weight * (1 - bodyFatPct/100)
 *      - Stima peso funzionale: weightFunctional = LBM + 5  (5 kg di grasso essenziale)
 *      - Usa weightFunctional per il calcolo della penalita' biomeccanica
 *      - Non penalizzare la massa muscolare nel calcolo del passo
 *    Se BMI > 30 e bodyFatPct NON e' fornito:
 *      - Penalita' ridotta rispetto al vecchio algoritmo: 1.5 s/km per kg in eccesso
 *        (il vecchio era 2.5 — ridotto perche' potrebbe essere muscolo)
 *
 * Fattore rischio biomeccanico (weight > 90 kg):
 *    NON rallentare il passo (no penalita' enorme).
 *    Restituire flag biomechanicalRisk = true e suggerimenti volume.
 *
 * References:
 *  - Daniels, J. (2005): Running Formula — zone percentages of vVO2max
 *  - Léger & Mercier (1983): vVO2max ≈ (VO2max − 3.5) / 0.2  m/min
 *  - Heil (2002): VO2max prediction from BMI
 *  - Londeree & Moeschberger (1982): HR-based VO2max approximation
 */

import type { AnchorMethod } from './user-profile'

export interface PaceZone {
  name: string
  description: string
  paceMin: number  // seconds/km lower bound (faster)
  paceMax: number  // seconds/km upper bound (slower)
  color: string
  effort: string
}

export interface PaceResult {
  bmi: number
  bmiCategory: string
  estimatedVO2max: number
  vVO2maxPace: number        // s/km at 100% vVO2max
  zones: PaceZone[]
  anchorMethod: AnchorMethod
  // Legacy fields mantenuti per compatibilita' con calculator/page.tsx
  heightAdjustment: number
  weightPenalty: number
  // Nuovi campi
  biomechanicalRisk: boolean          // true se peso > 90 kg
  biomechanicalTips: string[]         // suggerimenti se risk = true
  bodyCompositionNote: string | null  // nota se bodyFat fornito
}

export interface CalculateOptions {
  anchorMethod?: AnchorMethod
  referencePaceSeconds?: number  // s/km passo facile reale
  maxHR?: number                 // bpm
  bodyFatPct?: number            // %
}

// Daniels zone percentages of vVO2max (as fraction)
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
    description: 'Intensita\' massima. Circa 5-8 min. Non si parla. Ripetute o gare brevi.',
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
 * Stima VO2max da BMI (Heil 2002) — metodo fallback.
 */
function estimateVO2maxFromBMI(
  bmi: number,
  heightCm: number,
  gender: 'm' | 'f'
): { vo2max: number; heightAdj: number } {
  const base = gender === 'm'
    ? 60.9 - 1.77 * bmi
    : 54.9 - 1.77 * bmi

  const refHeight = gender === 'm' ? 170 : 160
  const heightAdj = (heightCm - refHeight) * 0.3
  const vo2max = Math.max(18, Math.min(80, base + heightAdj))

  return { vo2max, heightAdj }
}

/**
 * Stima VO2max da passo di corsa facile (Daniels & Gilbert, inversa).
 * Il passo di corsa facile/aerobica corrisponde a ~65-75% vVO2max.
 * Usiamo 70% come punto centrale.
 */
function estimateVO2maxFromPace(
  referencePaceSeconds: number  // s/km
): { vo2max: number } {
  // vVO2max stimato: il passo facile dell'utente corrisponde a ~70% vVO2max
  const vVO2maxMs = (1000 / referencePaceSeconds) / 0.70   // m/s
  const vVO2maxMmin = vVO2maxMs * 60                        // m/min
  // Léger & Mercier: VO2 [ml/kg/min] = v[m/min] * 0.2 + 3.5
  // A vVO2max si e' al 100% VO2max, quindi VO2 = VO2max
  const vo2max = Math.max(18, Math.min(80, vVO2maxMmin * 0.2 + 3.5))
  return { vo2max }
}

/**
 * Stima VO2max da FC massima (Londeree & Moeschberger 1982, approssimazione).
 * VO2max_approx = (HRmax - 72) * 0.6
 */
function estimateVO2maxFromHR(maxHR: number): { vo2max: number } {
  const vo2max = Math.max(18, Math.min(80, (maxHR - 72) * 0.6))
  return { vo2max }
}

/**
 * Calcola vVO2max pace (s/km) da VO2max.
 * Léger & Mercier: v [m/min] = (VO2max - 3.5) / 0.2
 */
function vo2maxToVVO2maxPace(vo2max: number): number {
  const vMs = ((vo2max - 3.5) / 0.2) / 60  // m/s
  return 1000 / vMs  // s/km
}

/**
 * Calcola penalita' biomeccanica per peso in eccesso.
 * Se bodyFatPct fornito e BMI > 30: penalizza solo il grasso in eccesso.
 * Altrimenti, penalita' ridotta (1.5 s/km per kg oltre BMI 22).
 */
function calcWeightPenalty(
  weightKg: number,
  heightM: number,
  bmi: number,
  bodyFatPct?: number
): { penalty: number; bodyCompositionNote: string | null } {
  const leanWeightRef = 22 * heightM * heightM  // BMI 22 come riferimento

  if (bmi > 30 && bodyFatPct !== undefined && bodyFatPct > 0) {
    // Calcola massa grassa e massa magra
    const fatMass = weightKg * (bodyFatPct / 100)
    const leanMass = weightKg - fatMass
    // Grasso essenziale stimato (uomini ~3%, donne ~10% — usiamo 5% generico)
    const essentialFat = weightKg * 0.05
    const excessFat = Math.max(0, fatMass - essentialFat)
    // Penalita' solo sul grasso in eccesso (non sulla massa muscolare)
    const penalty = excessFat * 1.8  // s/km per kg di grasso in eccesso
    const bodyCompositionNote = `Massa magra stimata: ${Math.round(leanMass)} kg. Penalita' calcolata solo sul grasso in eccesso (${Math.round(excessFat)} kg), non sulla massa muscolare.`
    return { penalty: Math.round(penalty), bodyCompositionNote }
  }

  if (bmi > 30) {
    // BMI alto ma senza % grasso: penalita' ridotta (potrebbe essere muscolo)
    const excessKg = Math.max(0, weightKg - leanWeightRef)
    const penalty = excessKg * 1.5  // ridotto da 2.5 a 1.5
    const bodyCompositionNote = 'BMI elevato rilevato. Inserisci la % massa grassa per una stima piu\' accurata (potrebbe essere muscolo).'
    return { penalty: Math.round(penalty), bodyCompositionNote }
  }

  // BMI normale/sovrappeso: penalita' standard
  const excessKg = Math.max(0, weightKg - leanWeightRef)
  const penalty = excessKg * 2.0
  return { penalty: Math.round(penalty), bodyCompositionNote: null }
}

/**
 * Calcola suggerimenti biomeccanici per utenti > 90 kg.
 * NON rallentare il passo: agire su volume e tecnica.
 */
function calcBiomechanicalRisk(weightKg: number): {
  risk: boolean
  tips: string[]
} {
  if (weightKg < 90) return { risk: false, tips: [] }

  return {
    risk: true,
    tips: [
      'Limita le sessioni a 30-40 minuti nei primi 2 mesi per ridurre il carico sulle articolazioni.',
      'Mantieni una cadenza di 170-180 passi/min: passi piu\' brevi e frequenti riducono l\'impatto verticale sulle ginocchia.',
      'Mantieni il tuo passo naturale di comfort — non forzare rallentamenti estremi.',
      'Prediligi superfici morbide (terra battuta, erba) quando possibile.',
      'Alterna 1 giorno di corsa con 1 giorno di recupero attivo (nuoto, bici) nelle prime 8 settimane.',
    ],
  }
}

export function calculatePaceZones(
  heightCm: number,
  weightKg: number,
  gender: 'f' | 'm' = 'm',
  options: CalculateOptions = {}
): PaceResult {
  const heightM = heightCm / 100
  const bmi = weightKg / (heightM * heightM)
  const anchorMethod = options.anchorMethod ?? 'anthropometric'

  // --- Stima VO2max ---
  let vo2max: number
  let heightAdj = 0

  if (anchorMethod === 'pace' && options.referencePaceSeconds && options.referencePaceSeconds > 0) {
    const r = estimateVO2maxFromPace(options.referencePaceSeconds)
    vo2max = r.vo2max
  } else if (anchorMethod === 'hr' && options.maxHR && options.maxHR > 100) {
    const r = estimateVO2maxFromHR(options.maxHR)
    vo2max = r.vo2max
  } else {
    // Fallback: Heil 2002 (BMI-based)
    const r = estimateVO2maxFromBMI(bmi, heightCm, gender)
    vo2max = r.vo2max
    heightAdj = r.heightAdj
  }

  // --- vVO2max pace ---
  const baseVVO2maxPace = vo2maxToVVO2maxPace(vo2max)

  // --- Penalita' peso ---
  const { penalty, bodyCompositionNote } = calcWeightPenalty(
    weightKg, heightM, bmi, options.bodyFatPct
  )

  // Se anchor e' pace-based: NON aggiungere penalita' peso
  // (il passo reale gia' riflette il peso dell'utente)
  const vVO2maxPace = anchorMethod === 'pace'
    ? baseVVO2maxPace
    : Math.round(baseVVO2maxPace + penalty)

  // --- Zone ---
  const zones: PaceZone[] = ZONE_DEFS.map((z) => ({
    name: z.name,
    description: z.description,
    color: z.color,
    effort: z.effort,
    paceMin: vVO2maxPace / z.hi,
    paceMax: vVO2maxPace / z.lo,
  }))

  // --- Rischio biomeccanico ---
  const { risk, tips } = calcBiomechanicalRisk(weightKg)

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory: bmiCategory(bmi),
    estimatedVO2max: Math.round(vo2max * 10) / 10,
    vVO2maxPace: Math.round(vVO2maxPace),
    zones,
    anchorMethod,
    heightAdjustment: Math.round(heightAdj * 10) / 10,
    weightPenalty: anchorMethod === 'pace' ? 0 : penalty,
    biomechanicalRisk: risk,
    biomechanicalTips: tips,
    bodyCompositionNote,
  }
}
