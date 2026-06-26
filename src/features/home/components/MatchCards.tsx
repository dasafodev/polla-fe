import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../../../ui/Card'
import { Flag } from '../../../ui/Flag'
import { fadeUp } from '../../../ui/motion'
import { useGroupMatches } from '../../groups/hooks'
import { useAllKoPredictions } from '../../predicciones/hooks'
import { deriveDayMatches, type MatchDisplay } from '../dayMatches'
import { formatKickoffBogota } from '../format'
import { now, todayBogota } from '../../../lib/clock'

// Todos los partidos del día (grupos + eliminatorias). Si hoy no hay, cae al próximo programado.
export function MatchCards() {
  const groupMatches = useGroupMatches({}, { pollMs: 60_000 })
  const ko = useAllKoPredictions()
  const koMatches = useMemo(() => ko.rounds.flatMap((r) => r.matches), [ko.rounds])
  const { matches, mode } = deriveDayMatches({
    groupMatches: groupMatches.data ?? [],
    koMatches,
    today: todayBogota(),
    now: now(),
  })

  if (matches.length === 0) return null

  return (
    <>
      <motion.div variants={fadeUp}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
          {mode === 'today' ? 'Partidos de hoy' : 'Próximo partido'}
        </p>
      </motion.div>
      {matches.map((m) => (
        <motion.div key={m.id} variants={fadeUp}>
          <MatchCard m={m} />
        </motion.div>
      ))}
    </>
  )
}

function MatchCard({ m }: { m: MatchDisplay }) {
  const live = m.status === 'live'
  const hasScore = m.scoreHome != null && m.scoreAway != null
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className={`font-mono text-[10px] font-bold uppercase tracking-wide ${live ? 'text-danger' : 'text-muted'}`}>{m.kicker}</p>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">{m.label}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <TeamSide team={m.home} fallback={m.homeLabel} />
        <div className="flex flex-col items-center gap-0.5">
          {hasScore ? (
            <span className={`font-display text-3xl font-extrabold tabular-nums ${live ? 'text-danger' : 'text-ink'}`}>
              {m.scoreHome}–{m.scoreAway}
            </span>
          ) : (
            <span className="font-display text-2xl font-extrabold text-ink-soft">vs</span>
          )}
          <span className={`font-mono text-[10px] font-bold uppercase tracking-wide ${live ? 'text-danger' : 'text-muted'}`}>
            {live ? 'EN VIVO' : m.status === 'finished' ? 'FINAL' : formatKickoffBogota(m.scheduledAt)}
          </span>
        </div>
        <TeamSide team={m.away} fallback={m.awayLabel} />
      </div>
    </Card>
  )
}

function TeamSide({ team, fallback }: { team: { code: string; flag: string | null } | null; fallback: string | null }) {
  return (
    <div className="flex w-20 flex-col items-center gap-1.5">
      <Flag code={team?.code ?? '?'} flag={team?.flag} className="size-9" />
      <span className="text-center text-sm font-bold leading-tight text-ink">{team?.code ?? fallback}</span>
    </div>
  )
}
