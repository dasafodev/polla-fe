import { motion } from 'framer-motion'
import { Card } from '../../../ui/Card'
import { Flag } from '../../../ui/Flag'
import { fadeUp } from '../../../ui/motion'
import { useGroupMatches } from '../../groups/hooks'
import { deriveMatchCards } from '../matchCards'
import { formatKickoffBogota } from '../format'
import type { GroupMatch, KoMatch } from '../../../types/api'
import type { MatchStatus } from '../../../types/enums'

interface MatchDisplay {
  label: string
  scheduledAt: string
  status: MatchStatus
  home: { code: string; flag: string | null } | null
  away: { code: string; flag: string | null } | null
  homeLabel: string | null
  awayLabel: string | null
  scoreHome: number | null
  scoreAway: number | null
}

const fromGroup = (m: GroupMatch): MatchDisplay => ({
  label: m.groupLabel ? `Grupo ${m.groupLabel}` : 'Fase de grupos',
  scheduledAt: m.scheduledAt, status: m.status,
  home: m.homeTeam, away: m.awayTeam,
  homeLabel: m.homeTeamLabel, awayLabel: m.awayTeamLabel,
  scoreHome: m.scoreHome, scoreAway: m.scoreAway,
})

const fromKo = (m: KoMatch): MatchDisplay => ({
  label: 'Eliminatorias',
  scheduledAt: m.scheduledAt, status: m.status,
  home: m.homeTeam, away: m.awayTeam,
  homeLabel: m.homeTeamLabel, awayLabel: m.awayTeamLabel,
  scoreHome: m.result?.scoreHome ?? null, scoreAway: m.result?.scoreAway ?? null,
})

// Dos cards individuales: el partido en curso/siguiente y el inmediatamente anterior.
// La fase de grupos manda; sin partidos de grupos por jugar, cae al próximo KO.
export function MatchCards({ koNext }: { koNext: KoMatch | null }) {
  const matches = useGroupMatches({}, { pollMs: 60_000 })
  const { current, previous } = deriveMatchCards(matches.data ?? [])
  const next = current ? fromGroup(current) : koNext ? fromKo(koNext) : null
  const prev = previous ? fromGroup(previous) : null
  if (!next && !prev) return null

  return (
    <>
      {next && (
        <motion.div variants={fadeUp}>
          <MatchCard kicker={next.status === 'live' ? 'En juego ahora' : 'Siguiente partido'} m={next} />
        </motion.div>
      )}
      {prev && (
        <motion.div variants={fadeUp}>
          <MatchCard kicker="Último partido" m={prev} />
        </motion.div>
      )}
    </>
  )
}

function MatchCard({ kicker, m }: { kicker: string; m: MatchDisplay }) {
  const live = m.status === 'live'
  const hasScore = m.scoreHome != null && m.scoreAway != null
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className={`font-mono text-[10px] font-bold uppercase tracking-wide ${live ? 'text-danger' : 'text-muted'}`}>{kicker}</p>
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
