import { motion } from 'framer-motion'
import { Card } from '../../../ui/Card'
import { Flag } from '../../../ui/Flag'
import { fadeUp } from '../../../ui/motion'
import { useGroupMatches } from '../../groups/hooks'
import { todayBogota } from '../../../lib/clock'
import { formatHour } from '../format'
import type { GroupMatch } from '../../../types/api'

// Marcadores del día (fase de grupos): informativos, no pagan puntos.
// El BE los sincroniza cada 5 min; aquí refrescamos cada 60s mientras el Inicio esté abierto.
export function TodayMatchesCard() {
  const matches = useGroupMatches({ date: todayBogota() }, { pollMs: 60_000 })
  const list = matches.data ?? []
  if (list.length === 0) return null

  return (
    <motion.div variants={fadeUp}>
      <Card className="p-4">
        <p className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted">Partidos de hoy</p>
        <div className="space-y-2.5">
          {list.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </div>
      </Card>
    </motion.div>
  )
}

function MatchRow({ m }: { m: GroupMatch }) {
  const live = m.status === 'live'
  const hasScore = m.scoreHome != null && m.scoreAway != null
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 font-mono text-[10px] font-bold text-muted">{m.groupLabel ?? ''}</span>
      <div className="flex flex-1 items-center justify-end gap-1.5">
        <span className="text-sm font-bold text-ink">{m.homeTeam?.code ?? m.homeTeamLabel}</span>
        <Flag code={m.homeTeam?.code ?? '?'} flag={m.homeTeam?.flag} className="size-5" />
      </div>
      <span className={`min-w-14 text-center font-mono text-sm font-bold ${live ? 'text-danger' : 'text-ink'}`}>
        {hasScore ? `${m.scoreHome}-${m.scoreAway}` : formatHour(m.scheduledAt)}
      </span>
      <div className="flex flex-1 items-center gap-1.5">
        <Flag code={m.awayTeam?.code ?? '?'} flag={m.awayTeam?.flag} className="size-5" />
        <span className="text-sm font-bold text-ink">{m.awayTeam?.code ?? m.awayTeamLabel}</span>
      </div>
      <span className={`w-12 shrink-0 text-right font-mono text-[10px] font-bold ${live ? 'text-danger' : 'text-muted'}`}>
        {live ? 'EN VIVO' : m.status === 'finished' ? 'FINAL' : ''}
      </span>
    </div>
  )
}
