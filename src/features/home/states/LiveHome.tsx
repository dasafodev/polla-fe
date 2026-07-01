import { motion } from 'framer-motion'
import { fadeUp, stagger } from '../../../ui/motion'
import { useLiveHome } from '../liveHome'
import { PendingKoAlert } from '../components/PendingKoAlert'
import { PositionCard } from '../components/PositionCard'
import { MatchCards } from '../components/MatchCards'
import type { ColombiaTakeover } from '../colombia/colombiaTakeover'

export function LiveHome({ takeover }: { takeover?: ColombiaTakeover | null }) {
  const live = useLiveHome()
  if (live.loading) return <LiveSkeleton />

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {live.pendingKo && (
        <motion.div variants={fadeUp}>
          <PendingKoAlert info={live.pendingKo} />
        </motion.div>
      )}
      {/* Con el takeover de Colombia activo se oculta el cuadro de posición: ese día el foco es Colombia. */}
      {!takeover && live.position && (
        <motion.div variants={fadeUp}>
          <PositionCard info={live.position} />
        </motion.div>
      )}
      <MatchCards excludeId={takeover?.match.id} heading={takeover ? 'También hoy' : undefined} />
    </motion.div>
  )
}

function LiveSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-card bg-surface-2" aria-busy />
      <div className="h-24 animate-pulse rounded-card bg-surface-2" />
      <div className="h-24 animate-pulse rounded-card bg-surface-2" />
    </div>
  )
}
