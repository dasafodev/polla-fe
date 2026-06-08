import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useOnboardingState, type StepKey } from './onboardingState'
import { SegmentedProgress } from '../../ui/SegmentedProgress'
import { Welcome } from './Welcome'
import { GroupDeck } from '../groups/GroupDeck'
import { Thirds } from '../groups/Thirds'
import { Powerups } from '../powerups/Powerups'

const ORDER: StepKey[] = ['groups', 'thirds', 'powerups']
const META: Record<StepKey, { kicker: string; title: string; help: string }> = {
  groups: {
    kicker: 'PASO 1 DE 3 · GRUPOS',
    title: 'Ordena cada grupo',
    help: 'Arrastra los equipos para ordenarlos del 1° al 4°, o usa las flechas.',
  },
  thirds: {
    kicker: 'PASO 2 DE 3 · TERCEROS',
    title: 'Mejores terceros',
    help: 'Elige los 8 mejores terceros entre todos los grupos.',
  },
  powerups: {
    kicker: 'PASO 3 DE 3 · POWERUPS',
    title: 'Tus powerups',
    help: 'Activa tu caballo oscuro y tu decepción del torneo.',
  },
}

export function OnboardingLayout() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const state = useOnboardingState()
  const [started, setStarted] = useState(false)

  const paso = params.get('paso') as StepKey | null
  const showWelcome = state.isFirstTime && !started && !paso
  const current: StepKey = paso ?? state.nextStepKey ?? 'groups'

  const segments = useMemo(
    () =>
      state.steps.map((s) => ({
        label: s.label.split(' ')[0],
        active: s.key === current,
        fill: Math.min(1, s.current / s.total),
      })),
    [state.steps, current],
  )

  function goStep(key: StepKey) {
    setParams({ paso: key })
  }
  function back() {
    const idx = ORDER.indexOf(current)
    if (idx > 0) goStep(ORDER[idx - 1])
    else nav('/')
  }

  if (showWelcome) return <Welcome onStart={() => setStarted(true)} />

  const meta = META[current]
  // Cada paso trae su propio CTA (footer fijo en Thirds/Powerups, navegación inline en Grupos):
  // no hay footer global. Solo reservamos espacio inferior para el footer fijo de los pasos 2 y 3.
  const hasFooter = current !== 'groups'
  return (
    <div className={`min-h-[100dvh] bg-bg ${hasFooter ? 'pb-[calc(96px+env(safe-area-inset-bottom))]' : 'pb-8'}`}>
      <div className="mx-auto max-w-[480px]">
        <header className="px-5 pt-[max(16px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <button
              onClick={back}
              aria-label="Atrás"
              className="grid size-10 place-items-center rounded-full border border-border bg-surface active:scale-95"
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
            <div className="flex-1">
              <SegmentedProgress segments={segments} />
            </div>
          </div>
          <p className="mt-5 font-mono text-xs font-bold tracking-wide text-violet">{meta.kicker}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{meta.title}</h1>
          <p className="mt-1 text-ink-soft">{meta.help}</p>
        </header>

        <div className="px-5 pt-6">
          {current === 'groups' && <GroupDeck onComplete={() => goStep('thirds')} />}
          {current === 'thirds' && <Thirds onComplete={() => goStep('powerups')} />}
          {current === 'powerups' && <Powerups onComplete={() => nav('/')} />}
        </div>
      </div>
    </div>
  )
}
