import { Link } from 'react-router-dom'
import { CaretRight } from '@phosphor-icons/react'
import type { PositionInfo } from '../liveHome'

export function PositionCard({ info }: { info: PositionInfo }) {
  return (
    <Link
      to="/tabla"
      aria-label="Ver la tabla de posiciones"
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-card active:scale-[0.99]"
    >
      <span className="font-mono text-2xl font-black text-violet">#{info.rank}</span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">
          {info.hasScores ? `${info.total} pts` : 'Aún sin puntos'}
          <span className="font-normal text-muted"> · de {info.totalParticipants}</span>
        </span>
        <span className="block text-xs text-ink-soft">{subtitle(info)}</span>
      </span>
      <CaretRight size={18} className="text-muted" />
    </Link>
  )
}

function subtitle(info: PositionInfo): string {
  if (!info.hasScores) return 'La tabla se llena cuando empiecen los partidos'
  const parts: string[] = []
  if (info.leaderGap > 0) parts.push(`Líder va +${info.leaderGap}`)
  else parts.push('¡Vas de líder!')
  if (info.podiumGap != null && info.podiumGap > 0) parts.push(`podio a +${info.podiumGap}`)
  return parts.join(' · ')
}
