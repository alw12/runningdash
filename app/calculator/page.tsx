'use client'
import { useState, useEffect } from 'react'
import { calculatePaceZones, PaceResult } from '@/lib/pace-calc'
import { getActivities } from '@/lib/storage'
import { getProfile, saveProfile } from '@/lib/user-profile'
import { formatPace } from '@/lib/utils'

function PaceBar({ paceMin, paceMax, color, vMax }: {
  paceMin: number; paceMax: number; color: string; vMax: number
}) {
  // vMax = highest pace s/km = slowest = right edge of bar
  const scaleMax = vMax * 1.05
  const left = Math.max(0, (1 - paceMax / scaleMax) * 100)
  const right = Math.max(0, (1 - paceMin / scaleMax) * 100)
  const width = Math.max(2, right - left)
  return (
    <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="absolute top-0 h-full rounded-full opacity-80"
        style={{ left: `${left}%`, width: `${width}%`, background: color }}
      />
    </div>
  )
}

export default function CalculatorPage() {
  const [height, setHeight] = useState(175)
  const [weight, setWeight] = useState(70)
  const [gender, setGender] = useState<'m' | 'f'>('m')
  const [result, setResult] = useState<PaceResult | null>(null)
  const [actualAvgPace, setActualAvgPace] = useState<number | null>(null)

  useEffect(() => {
    const profile = getProfile()
    if (profile) {
      setHeight(profile.heightCm)
      setWeight(profile.weightKg)
      setGender(profile.gender)
    }
    const acts = getActivities().filter(a => a.avgPace && a.avgPace < 510)
    if (acts.length > 0) {
      const avg = acts.reduce((s, a) => s + (a.avgPace ?? 0), 0) / acts.length
      setActualAvgPace(avg)
    }
  }, [])

  function calculate() {
    saveProfile({ heightCm: height, weightKg: weight, gender })
    setResult(calculatePaceZones(height, weight, gender))
  }

  // Highest (slowest) pace for scale
  const scaleMax = result ? result.zones[0].paceMax : 600

  const bmiColors: Record<string, string> = {
    'Sottopeso': 'text-blue-600 bg-blue-50',
    'Normopeso': 'text-green-600 bg-green-50',
    'Sovrappeso': 'text-orange-600 bg-orange-50',
    'Obeso': 'text-red-600 bg-red-50',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calcolatore Passo</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Stima le zone di allenamento ottimali in base alle tue misure corporee
        </p>
      </div>

      {/* Input form */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-800">Dati corporei</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* Gender */}
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Sesso</label>
            <div className="flex gap-2">
              {([['m', '♂ Uomo'], ['f', '♀ Donna']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setGender(v)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    gender === v
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Height */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
              Altezza — <span className="text-gray-900 font-bold">{height} cm</span>
            </label>
            <input
              type="range" min={140} max={210} value={height}
              onChange={e => setHeight(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>140 cm</span><span>210 cm</span>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
              Peso — <span className="text-gray-900 font-bold">{weight} kg</span>
            </label>
            <input
              type="range" min={40} max={140} value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>40 kg</span><span>140 kg</span>
            </div>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          Calcola zone di passo
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* BMI + VO2max summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">BMI</p>
              <p className="text-2xl font-bold text-gray-900">{result.bmi}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${bmiColors[result.bmiCategory] ?? ''}`}>
                {result.bmiCategory}
              </span>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">VO₂max stimato</p>
              <p className="text-2xl font-bold text-gray-900">{result.estimatedVO2max}</p>
              <p className="text-xs text-gray-400 mt-1">ml/kg/min</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Passo gara 5km</p>
              <p className="text-2xl font-bold text-orange-500">{formatPace(result.vVO2maxPace)}</p>
              <p className="text-xs text-gray-400 mt-1">min/km</p>
            </div>
          </div>

          {/* Height/weight adjustments note */}
          {(result.heightAdjustment !== 0 || result.weightPenalty > 0) && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-xs text-gray-500 space-y-0.5">
              {result.heightAdjustment !== 0 && (
                <p>↕ Altezza: {result.heightAdjustment > 0 ? '+' : ''}{result.heightAdjustment} ml/kg/min VO₂max ({result.heightAdjustment > 0 ? 'vantaggio' : 'svantaggio'} statura)</p>
              )}
              {result.weightPenalty > 0 && (
                <p>⚖ Peso extra: +{result.weightPenalty}s/km di penalità biomeccanica rispetto al normopeso</p>
              )}
            </div>
          )}

          {/* Actual comparison */}
          {actualAvgPace && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-blue-800 mb-1">Confronto con le tue corse</p>
              <p className="text-xs text-blue-600">
                Passo medio reale: <strong>{formatPace(actualAvgPace)}/km</strong>
                {' — '}
                {(() => {
                  const aero = result.zones[1]
                  if (actualAvgPace < aero.paceMin) return '🔴 Stai correndo più veloce del tuo aerobico. Rischio sovraccarico.'
                  if (actualAvgPace <= aero.paceMax) return '✅ Sei nel range aerobico. Ottimo!'
                  if (actualAvgPace <= result.zones[0].paceMax) return '🟡 Corri nella zona recupero. Puoi alzare il ritmo.'
                  return '🟠 Passo lento, probabilmente passeggiate incluse.'
                })()}
              </p>
            </div>
          )}

          {/* Zones */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Zone di allenamento</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Basate su VO₂max stimato via BMI + statura (Heil 2002 · Daniels zones)
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {result.zones.map((z) => (
                <div key={z.name} className="px-6 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: z.color }} />
                        <span className="font-semibold text-gray-900 text-sm">{z.name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{z.effort}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-5">{z.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-bold text-gray-900 text-sm" style={{ color: z.color }}>
                        {formatPace(z.paceMin)} – {formatPace(z.paceMax)}
                      </p>
                      <p className="text-xs text-gray-400">min/km</p>
                    </div>
                  </div>
                  <PaceBar
                    paceMin={z.paceMin}
                    paceMax={z.paceMax}
                    color={z.color}
                    vMax={scaleMax}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-gray-400 text-center pb-2">
            Stima teorica basata su BMI e statura — non tiene conto di età, forma fisica attuale, esperienza o condizioni di salute.
            Usala come punto di partenza, non come prescrizione medica.
          </p>
        </>
      )}
    </div>
  )
}
