import { Card } from '../../../ui/Card'
import { Flag } from '../../../ui/Flag'
import { formatKickoff } from '../format'
import type { KoMatch } from '../../../types/api'

// Solo se muestra cuando hay un partido KO con equipos definidos (no inventa fixtures de grupos).
export function NextMatchCard({ match }: { match: KoMatch }) {
  const live = match.status === 'live'
  return (
    <Card className="p-4">
      <p className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
        {live ? 'En juego ahora' : 'Próximo partido'}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag code={match.homeTeam!.code} flag={match.homeTeam!.flag} className="size-6" />
          <span className="text-sm font-bold text-ink">{match.homeTeam!.code}</span>
        </div>
        <span className={`font-mono text-xs font-bold ${live ? 'text-danger' : 'text-muted'}`}>
          {live ? 'EN VIVO' : formatKickoff(match.scheduledAt)}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-ink">{match.awayTeam!.code}</span>
          <Flag code={match.awayTeam!.code} flag={match.awayTeam!.flag} className="size-6" />
        </div>
      </div>
    </Card>
  )
}
