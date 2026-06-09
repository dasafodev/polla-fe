import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '../../../ui/Button'
import { NavyBackdrop } from '../../../ui/Backdrop'
import { fadeUp, stagger } from '../../../ui/motion'
import { FunFactCard } from '../components/FunFactCard'
import { MatchCountdown } from '../components/MatchCountdown'

export function EmptyHome({ closesAt }: { closesAt: string | null }) {
  const nav = useNavigate()
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-2xl p-6 text-white">
          <NavyBackdrop />
          <div className="relative z-10">
            <p className="font-mono text-xs font-bold tracking-wide text-violet-light">POLLA MUNDIAL 2026</p>
            <h2 className="mt-2 font-display text-3xl font-black leading-tight">Arma tu polla en 5 minutos</h2>
            <p className="mt-2 text-sm text-white/80">Ordena los 12 grupos, elige los mejores terceros y tus pálpitos.</p>
            <Button variant="light" fullWidth className="mt-5" onClick={() => nav('/onboarding')}>
              Empezar →
            </Button>
          </div>
        </div>
      </motion.div>

      {closesAt && (
        <motion.div variants={fadeUp}>
          <MatchCountdown targetIso={closesAt} />
        </motion.div>
      )}

      <motion.div variants={fadeUp}>
        <FunFactCard />
      </motion.div>
    </motion.div>
  )
}
