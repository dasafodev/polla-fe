import { motion } from 'framer-motion'
import { fadeUp, stagger } from '../../../ui/motion'
import { useLiveHome } from '../liveHome'
import { PendingKoAlert } from '../components/PendingKoAlert'
import { PositionCard } from '../components/PositionCard'
import { NextMatchCard } from '../components/NextMatchCard'
import { PalpitosBar } from '../components/PalpitosBar'

export function LiveHome() {
  const live = useLiveHome()
  if (live.loading) return <LiveSkeleton />

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
      {live.pendingKo && (
        <motion.div variants={fadeUp}>
          <PendingKoAlert info={live.pendingKo} />
        </motion.div>
      )}
      {live.position && (
        <motion.div variants={fadeUp}>
          <PositionCard info={live.position} />
        </motion.div>
      )}
      {live.nextMatch && (
        <motion.div variants={fadeUp}>
          <NextMatchCard match={live.nextMatch} />
        </motion.div>
      )}
      <motion.div variants={fadeUp}>
        <PalpitosBar info={live.palpitos} />
      </motion.div>
    </motion.div>
  )
}

function LiveSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-card bg-surface-2" aria-busy />
      <div className="h-16 animate-pulse rounded-card bg-surface-2" />
      <div className="h-20 animate-pulse rounded-card bg-surface-2" />
    </div>
  )
}
