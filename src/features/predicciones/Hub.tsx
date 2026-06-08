import { useNavigate } from 'react-router-dom'
import { CaretRight, Check, ListChecks } from '@phosphor-icons/react'
import { useOnboardingState, type StepKey, type StepStatus } from '../onboarding/onboardingState'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'

const ROUTE: Record<StepKey, string> = {
  groups: '/predicciones/grupos',
  thirds: '/predicciones/terceros',
  powerups: '/predicciones/powerups',
}

export function Hub() {
  const nav = useNavigate()
  const state = useOnboardingState()

  if (state.loading) return <HubSkeleton />

  const status = state.locked
    ? 'Predicciones cerradas. ¡Suerte!'
    : state.isComplete
      ? 'Todo listo. Puedes ajustar hasta el cierre.'
      : 'Completa tus predicciones antes del cierre.'

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-extrabold text-ink">Predicciones</h1>
        <p className="mt-1 text-sm text-ink-soft">{status}</p>
        <div className="mt-4 flex items-center gap-3">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
            <span className="block h-full rounded-full bg-violet" style={{ width: `${state.percent}%` }} />
          </span>
          <span className="font-mono text-sm font-bold text-violet">{state.percent}%</span>
        </div>
      </header>

      <Card className="divide-y divide-border">
        {state.steps.map((s) => (
          <button
            key={s.key}
            onClick={() => nav(ROUTE[s.key])}
            disabled={s.status === 'disabled'}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:opacity-50"
          >
            <StepIcon status={s.status} />
            <span className="flex-1">
              <span className="block font-medium text-ink">{s.label}</span>
              <span className="block text-sm text-ink-soft">{s.detail}</span>
            </span>
            <StepBadge status={s.status} />
            <CaretRight size={18} className="text-muted" />
          </button>
        ))}
      </Card>

      <button
        onClick={() => nav('/predicciones/revisar')}
        className="flex w-full items-center gap-3 rounded-card border border-border bg-surface px-4 py-3.5 text-left shadow-card active:scale-[0.99]"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-tint text-violet">
          <ListChecks size={18} weight="bold" />
        </span>
        <span className="flex-1 font-medium text-ink">Revisar todo</span>
        <CaretRight size={18} className="text-muted" />
      </button>
    </div>
  )
}

function StepIcon({ status }: { status: StepStatus }) {
  const done = status === 'done'
  return (
    <span
      className={`grid size-9 place-items-center rounded-xl ${
        done ? 'bg-success/15 text-success' : 'bg-tint text-violet'
      }`}
    >
      {done ? <Check size={18} weight="bold" /> : <span className="size-2.5 rounded-full bg-current" />}
    </span>
  )
}

function StepBadge({ status }: { status: StepStatus }) {
  if (status === 'done') return <Chip tone="success">Completo</Chip>
  if (status === 'in_progress') return <Chip tone="violet">En curso</Chip>
  if (status === 'disabled') return <Chip tone="lock">Bloqueado</Chip>
  return <Chip tone="neutral">Pendiente</Chip>
}

function HubSkeleton() {
  return (
    <div className="space-y-5 pt-2">
      <div className="h-7 w-40 animate-pulse rounded bg-surface-2" aria-busy />
      <div className="h-2 animate-pulse rounded-full bg-surface-2" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-card bg-surface-2" />
        ))}
      </div>
    </div>
  )
}
