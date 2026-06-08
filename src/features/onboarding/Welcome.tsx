import { motion } from 'framer-motion'
import { useAuth } from '../../auth/useAuth'
import { NavyBackdrop } from '../../ui/Backdrop'
import { Confetti } from '../../ui/Confetti'
import { Button } from '../../ui/Button'
import { fadeUp, stagger } from '../../ui/motion'

const STEPS = ['Ordena los 12 grupos', 'Elige los 8 mejores terceros', 'Activa tus 2 powerups']

export function Welcome({ onStart }: { onStart: () => void }) {
  const { participant } = useAuth()
  const first = participant?.name?.split(' ')[0] ?? ''
  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-6 text-white">
      <NavyBackdrop />
      <Confetti />
      <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10 w-full max-w-sm text-center">
        <motion.h1 variants={fadeUp} className="font-display text-3xl font-black">
          ¡Estás dentro{first ? `, ${first}` : ''}!
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-2 text-violet-light/90">
          Arma tu polla en 3 pasos. Te guiamos en cada uno.
        </motion.p>
        <motion.ul variants={stagger} className="mt-8 space-y-3 text-left">
          {STEPS.map((s, i) => (
            <motion.li
              key={s}
              variants={fadeUp}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet font-mono font-bold">
                {i + 1}
              </span>
              <span className="text-[15px]">{s}</span>
            </motion.li>
          ))}
        </motion.ul>
        <motion.div variants={fadeUp} className="mt-10">
          <Button variant="light" fullWidth onClick={onStart}>
            Empezar
          </Button>
          <button type="button" className="mt-4 text-sm text-white/70 underline underline-offset-2">
            ¿Cómo se juega?
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
