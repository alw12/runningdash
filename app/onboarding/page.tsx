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
    <div className="flex gap-2 justify-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === step ? 'w-6 bg-orange-400' : i < step ? 'w-1.5 bg-orange-300' : 'w-1.5 bg-gray-600'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Step 0: Splash ─────────────────────────────────────────────────────────
function Splash({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-8 space-y-10">
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-orange-400 text-5xl leading-none">⬡</span>
        </div>
        <h1 className="text-5xl font-bold text-white tracking-tight">RunDash</h1>
        <p className="text-gray-400 text-lg max-w-xs mx-auto leading-relaxed">
          La tua dashboard personale per gli allenamenti di corsa
        </p>
      </div>

      <div className="space-y-3 text-sm text-gray-500 max-w-xs">
        <div className="flex items-center gap-3">
          <span className="text-orange-400 text-base">◆</span>
          <span>Zone di passo personalizzate</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-orange-400 text-base">◉</span>
          <span>Tracciamento corse e percorsi GPS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-orange-400 text-base">◈</span>
          <span>Gestione scarpe e kilometraggio</span>
        </div>
      </div>

      <button
        onClick={onNext}
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-4 rounded-2xl text-lg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/25"
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
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest">Passo 1 di 2</p>
          <h2 className="text-2xl font-bold text-white">Il tuo profilo fisico</h2>
          <p className="text-gray-400 text-sm">Calcoliamo le zone di allenamento ideali per te</p>
        </div>

        <div className="bg-gray-800/60 backdrop-blur rounded-2xl border border-gray-700 p-6 space-y-5">
          {/* Gender */}
          <div>
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 block">Sesso</label>
            <div className="flex gap-2">
              {([['m', '♂ Uomo'], ['f', '♀ Donna']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setGender(v)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    gender === v
                      ? 'border-orange-400 bg-orange-500/20 text-orange-300'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Height */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Altezza</label>
              <span className="text-white font-bold text-sm">{height} cm</span>
            </div>
            <input
              type="range" min={140} max={210} value={height}
              onChange={e => setHeight(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>140 cm</span><span>210 cm</span>
            </div>
          </div>

          {/* Weight */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Peso</label>
              <span className="text-white font-bold text-sm">{weight} kg</span>
            </div>
            <input
              type="range" min={40} max={140} value={weight}
              onChange={e => setWeight(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>40 kg</span><span>140 kg</span>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Anteprima zone</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-xs text-gray-500">VO₂max stimato</p>
              <p className="text-xl font-bold text-white">{result.estimatedVO2max}</p>
              <p className="text-xs text-gray-600">ml/kg/min</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Zona aerobica</p>
              <p className="text-xl font-bold text-blue-400">{formatPace(aero.paceMin)}–{formatPace(aero.paceMax)}</p>
              <p className="text-xs text-gray-600">min/km</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNext(height, weight, gender)}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-xl transition-colors"
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
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest">Passo 2 di 2</p>
          <h2 className="text-2xl font-bold text-white">Le tue scarpe</h2>
          <p className="text-gray-400 text-sm">Traccia il kilometraggio di ogni paio</p>
        </div>

        <div className="bg-gray-800/60 backdrop-blur rounded-2xl border border-gray-700 overflow-hidden">
          {shoes.length === 0 && !adding && (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              Nessuna scarpa aggiunta
            </div>
          )}

          {shoes.map(s => (
            <div key={s.id} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700 last:border-0">
              <div>
                <p className="text-white font-medium text-sm">{s.displayName}</p>
                <p className="text-gray-500 text-xs">{s.brand}</p>
              </div>
              <button
                onClick={() => removeShoe(s.id)}
                className="text-gray-600 hover:text-red-400 transition-colors text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>
          ))}

          {adding ? (
            <div className="p-4 border-t border-gray-700 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  autoFocus
                  placeholder="Marca (Nike)"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="bg-gray-700 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-orange-400"
                />
                <input
                  placeholder="Modello (Pegasus)"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addShoe()}
                  className="bg-gray-700 text-white text-sm px-3 py-2 rounded-lg border border-gray-600 placeholder-gray-500 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={addShoe} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  Aggiungi
                </button>
                <button onClick={() => { setAdding(false); setBrand(''); setModel('') }} className="px-4 text-gray-400 hover:text-gray-300 text-sm transition-colors">
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full px-5 py-3 text-sm text-orange-400 hover:text-orange-300 hover:bg-gray-700/50 transition-colors text-left border-t border-gray-700 first:border-0"
            >
              + Aggiungi scarpa
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onFinish([])}
            className="flex-1 py-3.5 rounded-xl border border-gray-600 text-gray-400 hover:text-gray-300 hover:border-gray-500 text-sm font-medium transition-colors"
          >
            Salta
          </button>
          <button
            onClick={() => onFinish(shoes)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
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
    <div className="fixed inset-0 bg-gray-950 overflow-y-auto">
      {/* Ambient gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Step dots (hidden on splash) */}
      {step > 0 && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10">
          <Dots step={step - 1} total={2} />
        </div>
      )}

      {/* Steps */}
      <div className="relative z-10">
        {step === 0 && <Splash onNext={() => setStep(1)} />}
        {step === 1 && <StepCalculator onNext={handleCalcNext} />}
        {step === 2 && <StepShoes onFinish={handleShoesFinish} />}
      </div>
    </div>
  )
}
