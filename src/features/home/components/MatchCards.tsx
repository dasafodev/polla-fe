import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '../../../ui/Card'
import { Flag } from '../../../ui/Flag'
import { fadeUp } from '../../../ui/motion'
import { useGroupMatches } from '../../groups/hooks'
import { useAllKoPredictions } from '../../predicciones/hooks'
import { KoPredictionSheet } from '../../ko/KoPredictionSheet'
import { ROUND_LONG, tripleUsesRemaining } from '../../ko/koView'
import { deriveDayMatches, type MatchDisplay } from '../dayMatches'
import { formatKickoffBogota } from '../format'
import { now, todayBogota } from '../../../lib/clock'
import type { KoMatch } from '../../../types/api'

// Todos los partidos del día (grupos + eliminatorias). Si hoy no hay, cae al próximo programado.
export function MatchCards({ excludeId, heading }: { excludeId?: string; heading?: string } = {}) {
  const groupMatches = useGroupMatches({}, { pollMs: 60_000 })
  const ko = useAllKoPredictions()
  const koMatches = useMemo(() => ko.rounds.flatMap((r) => r.matches), [ko.rounds])
  const { matches, mode } = deriveDayMatches({
    groupMatches: groupMatches.data ?? [],
    koMatches,
    today: todayBogota(),
    now: now(),
  })

  // Pronóstico KO desde el Inicio: tocar un partido de eliminatorias abre el mismo sheet del panel
  // de Predicciones. El partido y su ronda se derivan de las rondas frescas (datos al día para el form).
  const [selectedId, setSelectedId] = useState<string | null>(null)
  let selectedMatch: KoMatch | null = null
  let selectedRound: string | undefined
  if (selectedId) {
    for (const r of ko.rounds) {
      const found = r.matches.find((mm) => mm.id === selectedId)
      if (found) {
        selectedMatch = found
        selectedRound = ROUND_LONG[r.round.slug]
        break
      }
    }
  }
  const tripleRemaining = tripleUsesRemaining(ko.rounds)

  // El takeover de Colombia sube su partido al héroe; aquí se excluye para no repetirlo.
  const shown = excludeId ? matches.filter((m) => m.id !== excludeId) : matches
  if (shown.length === 0) return null

  return (
    <>
      <motion.div variants={fadeUp}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
          {heading ?? (mode === 'today' ? 'Partidos de hoy' : 'Próximo partido')}
        </p>
      </motion.div>
      {shown.map((m) => (
        <motion.div key={m.id} variants={fadeUp}>
          <MatchCard m={m} onPick={m.kind === 'ko' ? () => setSelectedId(m.id) : undefined} />
        </motion.div>
      ))}

      <KoPredictionSheet
        match={selectedMatch}
        roundName={selectedRound}
        tripleRemaining={tripleRemaining}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}

function MatchCard({ m, onPick }: { m: MatchDisplay; onPick?: () => void }) {
  const live = m.status === 'live'
  const hasScore = m.scoreHome != null && m.scoreAway != null
  const body = (
    <>
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
      {m.prediction && (
        <div className="mt-3 flex items-center justify-center gap-1.5 border-t border-border pt-2.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">Tu pronóstico</span>
          <span className="font-mono text-xs font-bold tabular-nums text-ink-soft">
            {`${m.prediction.scoreHome}–${m.prediction.scoreAway}`}
          </span>
          {m.prediction.advancesCode && (
            <span className="text-[11px] text-muted">{`· pasa ${m.prediction.advancesCode}`}</span>
          )}
        </div>
      )}
    </>
  )

  if (onPick) {
    return (
      <button
        type="button"
        onClick={onPick}
        aria-label={`${m.home?.code ?? m.homeLabel ?? '?'} vs ${m.away?.code ?? m.awayLabel ?? '?'}`}
        className="block w-full text-left active:scale-[0.99]"
      >
        <Card className="p-4">{body}</Card>
      </button>
    )
  }
  return <Card className="p-4">{body}</Card>
}

function TeamSide({ team, fallback }: { team: { code: string; flag: string | null } | null; fallback: string | null }) {
  return (
    <div className="flex w-20 flex-col items-center gap-1.5">
      <Flag code={team?.code ?? '?'} flag={team?.flag} className="size-9" />
      <span className="text-center text-sm font-bold leading-tight text-ink">{team?.code ?? fallback}</span>
    </div>
  )
}
