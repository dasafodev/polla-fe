import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SignOut, CaretRight, Check } from '@phosphor-icons/react'
import { useAuth } from '../../auth/useAuth'
import { useLogout } from '../../auth/hooks'
import { useOnboardingState, type StepKey, type StepStatus } from '../onboarding/onboardingState'
import { Avatar } from '../../ui/Avatar'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { Button } from '../../ui/Button'
import { ProgressRing } from '../../ui/ProgressRing'
import { NavyBackdrop } from '../../ui/Backdrop'
import { fadeUp, stagger } from '../../ui/motion'

export function Dashboard() {
  const { participant } = useAuth()
  const logout = useLogout()
  const nav = useNavigate()
  const state = useOnboardingState()
  const [menu, setMenu] = useState(false)
  const name = participant?.name ?? '…'

  const days = state.closesAt ? daysUntil(state.closesAt) : null
  const heroTitle = state.isComplete ? '¡Polla completa!' : state.isFirstTime ? 'Arma tu polla' : 'Casi lista'
  const heroSub = state.locked
    ? 'Predicciones cerradas. ¡Suerte!'
    : state.isComplete
      ? 'Listo. Puedes ajustar hasta el cierre.'
      : nextLabel(state.nextStepKey)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.header variants={fadeUp} className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Hola, {name}</h1>
          <p className="text-sm text-ink-soft">
            {state.locked
              ? 'El Mundial ya arrancó'
              : days != null
                ? `Faltan ${days} días para el cierre`
                : 'Antes de que arranque el Mundial'}
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-label="Tu cuenta" className="active:scale-95">
            <Avatar name={name} />
          </button>
          {menu && (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-border bg-surface p-1 shadow-diffuse">
              <button
                onClick={() => logout.mutate(undefined, { onSuccess: () => nav('/login') })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-ink hover:bg-surface-2"
              >
                <SignOut size={18} weight="bold" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </motion.header>

      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-2xl p-6 text-white">
          <NavyBackdrop />
          <div className="relative z-10 flex items-center gap-5">
            <ProgressRing percent={state.percent} size={132} stroke={12} />
            <div className="flex-1">
              <p className="font-mono text-xs font-bold tracking-wide text-violet-light">TU POLLA</p>
              <h2 className="mt-1 font-display text-2xl font-black">{heroTitle}</h2>
              <p className="mt-1 text-sm text-white/80">{heroSub}</p>
            </div>
          </div>
          {!state.locked && !state.isComplete && (
            <Button
              variant="light"
              fullWidth
              className="relative z-10 mt-5"
              onClick={() => nav(state.nextStepKey ? `/onboarding?paso=${state.nextStepKey}` : '/onboarding')}
            >
              Continuar donde quedé
            </Button>
          )}
        </div>
      </motion.div>

      <motion.section variants={fadeUp}>
        <h3 className="mb-2 px-1 font-display font-bold text-ink">Completa tu polla</h3>
        <Card className="divide-y divide-border">
          {state.steps.map((s) => (
            <button
              key={s.key}
              onClick={() => nav(`/onboarding?paso=${s.key}`)}
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
      </motion.section>

      <motion.section variants={fadeUp}>
        <Card className="flex items-center gap-4 border-gold/30 bg-[#f8f2e4] p-5">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold/15 font-display text-2xl font-black text-gold">
            $
          </span>
          <div className="flex-1">
            <p className="font-display font-bold text-ink">Bolsa $1.000.000</p>
            <p className="font-mono text-sm text-ink-soft">1° 700k · 2° 250k · 3° 50k</p>
          </div>
        </Card>
      </motion.section>
    </motion.div>
  )
}

function nextLabel(key: StepKey | null): string {
  if (key === 'groups') return 'Sigue: ordena los grupos'
  if (key === 'thirds') return 'Sigue: elige los terceros'
  if (key === 'powerups') return 'Sigue: elige tus pálpitos'
  return 'Todo en orden'
}

function daysUntil(iso: string): number {
  const ms = Date.parse(iso) - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
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
