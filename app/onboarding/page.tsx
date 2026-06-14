'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveProfile } from '@/lib/user-profile'
import { getShoes, saveShoes } from '@/lib/storage'
import { Shoe } from '@/types'
import { formatPace } from '@/lib/utils'
import { calculatePaceZones } from '@/lib/pace-calc'

const ONBOARDED_KEY = 'rd_onboarded_v1'

// ─── Step indicators ────────────────────────────────────────────────────────
function Dots({ step, total }: { step: number; total: number }) {
  return (
    <div className="d-flex gap-2 justify-content-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '6px',
            borderRadius: '9999px',
            transition: 'all 0.3s',
            width: i === step ? '24px' : '6px',
            backgroundColor: i === step ? '#fb923c' : i < step ? '#fdba74' : '#4b5563',
          }}
        />
      ))}
    </div>
  )
}

// ─── Step 0: Splash ─────────────────────────────────────────────────────────
function Splash({ onNext }: { onNext: () => void }) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-center px-4"
      style={{ minHeight: '100vh', gap: '2.5rem' }}
    >
      {/* Logo + title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="d-flex align-items-center justify-content-center gap-3 mb-2">
          <span style={{ color: '#f97316', fontSize: '3rem', lineHeight: 1 }}>⬡</span>
        </div>
        <h1 className="fw-bold text-white" style={{ fontSize: '3rem', letterSpacing: '-0.025em' }}>
          RunDash
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '1.125rem', maxWidth: '20rem', margin: '0 auto', lineHeight: 1.6 }}>
          La tua dashboard personale per gli allenamenti di corsa
        </p>
      </div>

      {/* Feature bullets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#6b7280', maxWidth: '20rem' }}>
        <div className="d-flex align-items-center gap-3">
          <span style={{ color: '#f97316', fontSize: '1rem' }}>◆</span>
          <span>Zone di passo personalizzate</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span style={{ color: '#f97316', fontSize: '1rem' }}>◉</span>
          <span>Tracciamento corse e percorsi GPS</span>
        </div>
        <div className="d-flex align-items-center gap-3">
          <span style={{ color: '#f97316', fontSize: '1rem' }}>◈</span>
          <span>Gestione scarpe e kilometraggio</span>
        </div>
      </div>

      <button
        onClick={onNext}
        className="btn btn-warning fw-semibold"
        style={{
          padding: '1rem 2.5rem',
          borderRadius: '1rem',
          fontSize: '1.125rem',
          backgroundColor: '#f97316',
          border: 'none',
          color: '#fff',
          boxShadow: '0 8px 24px rgba(249,115,22,0.25)',
        }}
      >
        Inizia →
      </button>
    </div>
  )
}

// ─── Step 1: Calculator profile ─────────────────────────────────────────────
function StepCalculator({ onNext }: { onNext: (h: number, w: number, g: 'm' | 'f') => void }) {
  const [height, setHeight] = useState(175)
  const [weight, setWeight] = useState(70)
  const [gender, setGender] = useState<'m' | 'f'>('m')

  const result = calculatePaceZones(height, weight, gender)
  const aero = result.zones[1]

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center px-3"
      style={{ minHeight: '100vh' }}
    >
      <div className="w-100" style={{ maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p style={{ color: '#fb923c', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Passo 1 di 2
          </p>
          <h2 className="fw-bold text-white" style={{ fontSize: '1.5rem' }}>Il tuo profilo fisico</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Calcoliamo le zone di allenamento ideali per te</p>
        </div>

        {/* Card inputs */}
        <div
          className="card border-secondary"
          style={{ background: 'rgba(31,41,55,0.6)', backdropFilter: 'blur(8px)', borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          {/* Gender */}
          <div>
            <label
              style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}
            >
              Sesso
            </label>
            <div className="d-flex gap-2">
              {([['m', '♂ Uomo'], ['f', '♀ Donna']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setGender(v)}
                  className="flex-fill py-2 fw-semibold"
                  style={{
                    borderRadius: '0.75rem',
                    fontSize: '0.875rem',
                    border: `2px solid ${gender === v ? '#fb923c' : '#4b5563'}`,
                    background: gender === v ? 'rgba(249,115,22,0.15)' : 'transparent',
                    color: gender === v ? '#fdba74' : '#9ca3af',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Height */}
          <div>
            <div className="d-flex justify-content-between mb-2">
              <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Altezza
              </label>
              <span className="text-white fw-bold" style={{ fontSize: '0.875rem' }}>{height} cm</span>
            </div>
            <input
              type="range" min={140} max={210} value={height}
              onChange={e => setHeight(Number(e.target.value))}
              className="form-range w-100"
              style={{ accentColor: '#f97316' }}
            />
            <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '0.25rem' }}>
              <span>140 cm</span><span>210 cm</span>
            </div>
          </div>

          {/* Weight */}
          <div>
            <div className="d-flex justify-content-between mb-2">
              <label style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Peso
              </label>
              <span className="text-white fw-bold" style={{ fontSize: '0.875rem' }}>{weight} kg</span>
            </div>
            <input
              type="range" min={40} max={140} value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              className="form-range w-100"
              style={{ accentColor: '#f97316' }}
            />
            <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem', color: '#4b5563', marginTop: '0.25rem' }}>
              <span>40 kg</span><span>140 kg</span>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div
          style={{
            background: 'rgba(31,41,55,0.4)',
            borderRadius: '0.75rem',
            border: '1px solid #374151',
            padding: '1rem',
          }}
        >
          <p style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Anteprima zone
          </p>
          <div className="row g-2 text-center">
            <div className="col-6">
              <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>VO₂max stimato</p>
              <p className="text-white fw-bold" style={{ fontSize: '1.25rem' }}>{result.estimatedVO2max}</p>
              <p style={{ fontSize: '0.7rem', color: '#4b5563' }}>ml/kg/min</p>
            </div>
            <div className="col-6">
              <p style={{ fontSize: '0.7rem', color: '#6b7280' }}>Zona aerobica</p>
              <p className="fw-bold" style={{ fontSize: '1.25rem', color: '#60a5fa' }}>
                {formatPace(aero.paceMin)}–{formatPace(aero.paceMax)}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#4b5563' }}>min/km</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNext(height, weight, gender)}
          className="btn w-100 fw-semibold"
          style={{
            backgroundColor: '#f97316',
            border: 'none',
            color: '#fff',
            padding: '0.875rem',
            borderRadius: '0.75rem',
            fontSize: '1rem',
          }}
        >
          Avanti →
        </button>
      </div>
    </div>
  )
}

// ─── Step 2: Shoes ──────────────────────────────────────────────────────────
function StepShoes({ onFinish }: { onFinish: (shoes: Shoe[]) => void }) {
  const [shoes, setShoes] = useState<Shoe[]>([])
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [adding, setAdding] = useState(false)

  function addShoe() {
    if (!brand.trim() || !model.trim()) return
    const shoe: Shoe = {
      id: `shoe-${Date.now()}`,
      brand: brand.trim(),
      model: model.trim(),
      displayName: `${brand.trim()} ${model.trim()}`,
    }
    setShoes(prev => [...prev, shoe])
    setBrand('')
    setModel('')
    setAdding(false)
  }

  function removeShoe(id: string) {
    setShoes(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center px-3"
      style={{ minHeight: '100vh' }}
    >
      <div className="w-100" style={{ maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p style={{ color: '#fb923c', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Passo 2 di 2
          </p>
          <h2 className="fw-bold text-white" style={{ fontSize: '1.5rem' }}>Le tue scarpe</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Traccia il kilometraggio di ogni paio</p>
        </div>

        {/* Shoes card */}
        <div
          style={{
            background: 'rgba(31,41,55,0.6)',
            backdropFilter: 'blur(8px)',
            borderRadius: '1rem',
            border: '1px solid #374151',
            overflow: 'hidden',
          }}
        >
          {shoes.length === 0 && !adding && (
            <div className="text-center px-4 py-5" style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Nessuna scarpa aggiunta
            </div>
          )}

          {shoes.map(s => (
            <div
              key={s.id}
              className="d-flex align-items-center justify-content-between px-4"
              style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #374151' }}
            >
              <div>
                <p className="text-white fw-medium mb-0" style={{ fontSize: '0.875rem' }}>{s.displayName}</p>
                <p style={{ color: '#6b7280', fontSize: '0.75rem', marginBottom: 0 }}>{s.brand}</p>
              </div>
              <button
                onClick={() => removeShoe(s.id)}
                className="btn btn-link p-1"
                style={{ color: '#4b5563', fontSize: '0.875rem', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
              >
                ✕
              </button>
            </div>
          ))}

          {adding ? (
            <div style={{ padding: '1rem', borderTop: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="row g-2">
                <div className="col-6">
                  <input
                    autoFocus
                    placeholder="Marca (Nike)"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="form-control"
                    style={{
                      background: '#374151',
                      color: '#fff',
                      border: '1px solid #4b5563',
                      fontSize: '0.875rem',
                      borderRadius: '0.5rem',
                    }}
                  />
                </div>
                <div className="col-6">
                  <input
                    placeholder="Modello (Pegasus)"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addShoe()}
                    className="form-control"
                    style={{
                      background: '#374151',
                      color: '#fff',
                      border: '1px solid #4b5563',
                      fontSize: '0.875rem',
                      borderRadius: '0.5rem',
                    }}
                  />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  onClick={addShoe}
                  className="btn flex-fill fw-medium"
                  style={{
                    backgroundColor: '#f97316',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.875rem',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                  }}
                >
                  Aggiungi
                </button>
                <button
                  onClick={() => { setAdding(false); setBrand(''); setModel('') }}
                  className="btn btn-link px-3"
                  style={{ color: '#9ca3af', fontSize: '0.875rem', textDecoration: 'none' }}
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="btn btn-link w-100 text-start"
              style={{
                color: '#fb923c',
                fontSize: '0.875rem',
                padding: '0.875rem 1.25rem',
                borderTop: shoes.length > 0 ? '1px solid #374151' : 'none',
                textDecoration: 'none',
                borderRadius: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = '#fdba74'
                e.currentTarget.style.background = 'rgba(55,65,81,0.5)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = '#fb923c'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              + Aggiungi scarpa
            </button>
          )}
        </div>

        {/* Footer actions */}
        <div className="d-flex gap-3">
          <button
            onClick={() => onFinish([])}
            className="btn flex-fill fw-medium"
            style={{
              padding: '0.875rem',
              borderRadius: '0.75rem',
              border: '1px solid #4b5563',
              color: '#9ca3af',
              background: 'transparent',
              fontSize: '0.875rem',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#d1d5db'; e.currentTarget.style.borderColor = '#6b7280' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#4b5563' }}
          >
            Salta
          </button>
          <button
            onClick={() => onFinish(shoes)}
            className="btn flex-fill fw-semibold"
            style={{
              backgroundColor: '#f97316',
              border: 'none',
              color: '#fff',
              padding: '0.875rem',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
            }}
          >
            {shoes.length > 0 ? `Salva ${shoes.length} scarpe →` : 'Continua →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main orchestrator ───────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Saved between steps
  const [profile, setProfile] = useState<{ h: number; w: number; g: 'm' | 'f' } | null>(null)

  function handleCalcNext(h: number, w: number, g: 'm' | 'f') {
    setProfile({ h, w, g })
    setStep(2)
  }

  function handleShoesFinish(shoes: Shoe[]) {
    // Persist profile
    if (profile) {
      saveProfile({ heightCm: profile.h, weightKg: profile.w, gender: profile.g })
    }
    // Persist shoes (merge with any existing)
    if (shoes.length > 0) {
      const existing = getShoes()
      const merged = [...existing, ...shoes.filter(s => !existing.find(e => e.id === s.id))]
      saveShoes(merged)
    }
    // Mark onboarded
    localStorage.setItem(ONBOARDED_KEY, '1')
    router.replace('/')
  }

  return (
    <div
      style={{ background: '#030712', minHeight: '100vh', position: 'fixed', inset: 0, overflowY: 'auto' }}
    >
      {/* Ambient gradient blobs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '24rem',
            height: '24rem',
            background: 'rgba(249,115,22,0.08)',
            borderRadius: '9999px',
            filter: 'blur(64px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '16rem',
            height: '16rem',
            background: 'rgba(59,130,246,0.04)',
            borderRadius: '9999px',
            filter: 'blur(64px)',
          }}
        />
      </div>

      {/* Step dots (hidden on splash) */}
      {step > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}
        >
          <Dots step={step - 1} total={2} />
        </div>
      )}

      {/* Steps */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        {step === 0 && <Splash onNext={() => setStep(1)} />}
        {step === 1 && <StepCalculator onNext={handleCalcNext} />}
        {step === 2 && <StepShoes onFinish={handleShoesFinish} />}
      </div>
    </div>
  )
}
