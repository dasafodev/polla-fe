import { motion } from 'framer-motion'
import { Check } from '@phosphor-icons/react'
import { NavyBackdrop } from '../../../ui/Backdrop'
import { fadeUp, stagger } from '../../../ui/motion'
import { StarBets } from '../components/StarBets'
import { MatchCountdown } from '../components/MatchCountdown'
import { daysUntil } from '../format'
import type { OnboardingState } from '../../onboarding/onboardingState'

export function ReadyHome({ state }: { state: OnboardingState }) {
  const days = state.closesAt ? daysUntil(state.closesAt) : null

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-2xl p-6 text-center text-white">
          <NavyBackdrop />
          <div className="relative z-10">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-success/20 text-success">
              <Check size={26} weight="bold" />
            </span>
            <h2 className="mt-3 font-display text-2xl font-black">¡Polla lista!</h2>
            <p className="mt-1 text-sm text-white/80">
              {days != null ? (
                <>
                  Cierra en <b className="text-white">{days === 0 ? 'menos de un día' : `${days} días`}</b>. Ajusta lo que
                  quieras hasta entonces.
                </>
              ) : (
                'Ajusta lo que quieras hasta el cierre.'
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {state.closesAt && (
        <motion.div variants={fadeUp}>
          <MatchCountdown targetIso={state.closesAt} />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <StarBets />
      </motion.div>
    </motion.div>
  )
}
