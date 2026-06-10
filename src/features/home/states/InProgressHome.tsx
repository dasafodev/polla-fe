import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../../../ui/Button'
import { Chip } from '../../../ui/Chip'
import { ProgressRing } from '../../../ui/ProgressRing'
import { NavyBackdrop } from '../../../ui/Backdrop'
import { fadeUp, stagger } from '../../../ui/motion'
import { MatchCountdown } from '../components/MatchCountdown'
import type { OnboardingState } from '../../onboarding/onboardingState'

export function InProgressHome({ state }: { state: OnboardingState }) {
  const nav = useNavigate()
  const pending = state.steps.filter((s) => s.status !== 'done').map((s) => s.label)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-2xl p-6 text-white">
          <NavyBackdrop />
          <div className="relative z-10 flex items-center gap-5">
            <ProgressRing percent={state.percent} size={104} stroke={11} />
            <div className="flex-1">
              <p className="font-mono text-xs font-bold tracking-wide text-violet-light">TU POLLA</p>
              <h2 className="mt-1 font-display text-2xl font-black">Casi lista</h2>
              <p className="mt-1 text-sm text-white/80">Te falta: {joinEs(pending)}</p>
            </div>
          </div>
          <Button
            variant="light"
            fullWidth
            className="relative z-10 mt-5"
            onClick={() => nav(state.nextStepKey ? `/onboarding?paso=${state.nextStepKey}` : '/onboarding')}
          >
            Continuar donde quedé →
          </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
        {state.steps.map((s) => {
          if (s.status === 'done') return <Chip key={s.key} tone="success">✓ {s.label}</Chip>
          if (s.status === 'disabled') return <Chip key={s.key} tone="lock">{s.label}</Chip>
          return (
            <Chip key={s.key} tone="violet">
              {s.label} · {s.current}/{s.total}
            </Chip>
          )
        })}
      </motion.div>

      {state.closesAt && (
        <motion.div variants={fadeUp}>
          <MatchCountdown targetIso={state.closesAt} />
        </motion.div>
      )}
    </motion.div>
  )
}

function joinEs(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`
}
