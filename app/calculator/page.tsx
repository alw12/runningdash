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
    <div className="progress" style={{ height: '10px' }}>
      <div
        className="progress-bar"
        role="progressbar"
        style={{
          marginLeft: `${left}%`,
          width: `${width}%`,
          background: color,
          opacity: 0.85,
        }}
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
    'Sottopeso': 'text-primary',
    'Normopeso': 'text-success',
    'Sovrappeso': 'text-warning',
    'Obeso': 'text-danger',
  }

  return (
    <div className="d-flex flex-column gap-4" style={{ maxWidth: '720px' }}>
      <div>
        <h1 className="h4 fw-bold mb-0">Calcolatore Passo</h1>
        <p className="text-muted small mb-0">
          Stima le zone di allenamento ottimali in base alle tue misure corporee
        </p>
      </div>

      {/* Input form */}
      <div className="card">
        <div className="card-body d-flex flex-column gap-4">
          <h2 className="h6 fw-semibold mb-0">Dati corporei</h2>

          {/* Gender */}
          <div>
            <label className="form-label text-uppercase text-muted small fw-medium" style={{ letterSpacing: '0.05em' }}>
              Sesso
            </label>
            <div className="btn-group w-100" role="group">
              {([['m', '♂ Uomo'], ['f', '♀ Donna']] as const).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setGender(v)}
                  className={`btn ${gender === v ? 'btn-brand' : 'btn-outline-secondary'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-4">
            {/* Height */}
            <div className="col-md-6">
              <label className="form-label text-uppercase text-muted small fw-medium" style={{ letterSpacing: '0.05em' }}>
                Altezza — <span className="text-dark fw-bold">{height} cm</span>
              </label>
              <input
                type="range"
                min={140}
                max={210}
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
                className="form-range"
              />
              <div className="d-flex justify-content-between">
                <span className="small text-muted">140 cm</span>
                <span className="small text-muted">210 cm</span>
              </div>
            </div>

            {/* Weight */}
            <div className="col-md-6">
              <label className="form-label text-uppercase text-muted small fw-medium" style={{ letterSpacing: '0.05em' }}>
                Peso — <span className="text-dark fw-bold">{weight} kg</span>
              </label>
              <input
                type="range"
                min={40}
                max={140}
                value={weight}
                onChange={e => setWeight(Number(e.target.value))}
                className="form-range"
              />
              <div className="d-flex justify-content-between">
                <span className="small text-muted">40 kg</span>
                <span className="small text-muted">140 kg</span>
              </div>
            </div>
          </div>

          <button
            onClick={calculate}
            className="btn btn-brand w-100"
          >
            Calcola zone di passo
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* BMI + VO2max summary */}
          <div className="row g-3">
            <div className="col-4">
              <div className="card text-center h-100">
                <div className="card-body py-3">
                  <p className="text-uppercase text-muted small fw-medium mb-1" style={{ letterSpacing: '0.05em' }}>BMI</p>
                  <p className="h4 fw-bold mb-1">{result.bmi}</p>
                  <span className={`badge ${bmiColors[result.bmiCategory] ?? ''} bg-opacity-10 fw-medium small`}>
                    {result.bmiCategory}
                  </span>
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="card text-center h-100">
                <div className="card-body py-3">
                  <p className="text-uppercase text-muted small fw-medium mb-1" style={{ letterSpacing: '0.05em' }}>VO₂max stimato</p>
                  <p className="h4 fw-bold mb-1">{result.estimatedVO2max}</p>
                  <p className="small text-muted mb-0">ml/kg/min</p>
                </div>
              </div>
            </div>
            <div className="col-4">
              <div className="card text-center h-100">
                <div className="card-body py-3">
                  <p className="text-uppercase text-muted small fw-medium mb-1" style={{ letterSpacing: '0.05em' }}>Passo gara 5km</p>
                  <p className="h4 fw-bold mb-1" style={{ color: 'var(--bs-brand, #f97316)' }}>{formatPace(result.vVO2maxPace)}</p>
                  <p className="small text-muted mb-0">min/km</p>
                </div>
              </div>
            </div>
          </div>

          {/* Height/weight adjustments note */}
          {(result.heightAdjustment !== 0 || result.weightPenalty > 0) && (
            <div className="card bg-light border">
              <div className="card-body py-2 px-3 small text-muted d-flex flex-column gap-1">
                {result.heightAdjustment !== 0 && (
                  <p className="mb-0">
                    ↕ Altezza: {result.heightAdjustment > 0 ? '+' : ''}{result.heightAdjustment} ml/kg/min VO₂max ({result.heightAdjustment > 0 ? 'vantaggio' : 'svantaggio'} statura)
                  </p>
                )}
                {result.weightPenalty > 0 && (
                  <p className="mb-0">
                    ⚖ Peso extra: +{result.weightPenalty}s/km di penalità biomeccanica rispetto al normopeso
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actual comparison */}
          {actualAvgPace && (
            <div className="card border-primary bg-primary bg-opacity-10">
              <div className="card-body py-2 px-3">
                <p className="fw-semibold text-primary-emphasis small mb-1">Confronto con le tue corse</p>
                <p className="small text-primary mb-0">
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
            </div>
          )}

          {/* Zones */}
          <div className="card">
            <div className="card-header">
              <h2 className="h6 fw-semibold mb-0">Zone di allenamento</h2>
              <p className="small text-muted mb-0">
                Basate su VO₂max stimato via BMI + statura (Heil 2002 · Daniels zones)
              </p>
            </div>
            <div className="card-body d-flex flex-column gap-2 p-3">
              {result.zones.map((z) => (
                <div key={z.name} className="card mb-2 border">
                  <div className="card-body py-3 px-4">
                    <div className="d-flex align-items-start justify-content-between mb-2">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="rounded-circle flex-shrink-0"
                            style={{ width: '12px', height: '12px', background: z.color, display: 'inline-block' }}
                          />
                          <span className="fw-semibold small">{z.name}</span>
                          <span className="badge bg-secondary bg-opacity-10 text-secondary fw-medium" style={{ fontSize: '0.7rem' }}>
                            {z.effort}
                          </span>
                        </div>
                        <p className="small text-muted mb-0 mt-1" style={{ paddingLeft: '20px' }}>{z.description}</p>
                      </div>
                      <div className="text-end flex-shrink-0 ms-3">
                        <p className="fw-bold small mb-0" style={{ color: z.color }}>
                          {formatPace(z.paceMin)} – {formatPace(z.paceMax)}
                        </p>
                        <p className="small text-muted mb-0">min/km</p>
                      </div>
                    </div>
                    <PaceBar
                      paceMin={z.paceMin}
                      paceMax={z.paceMax}
                      color={z.color}
                      vMax={scaleMax}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="small text-muted text-center pb-2">
            Stima teorica basata su BMI e statura — non tiene conto di età, forma fisica attuale, esperienza o condizioni di salute.
            Usala come punto di partenza, non come prescrizione medica.
          </p>
        </>
      )}
    </div>
  )
}
