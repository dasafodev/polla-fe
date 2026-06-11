import { Link } from 'react-router-dom'
import { TrendUp, TrendDown } from '@phosphor-icons/react'
import { usePowerups } from '../powerups/hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import type { PowerupTeam } from '../../types/api'

export function PowerupsPanel({ locked }: { locked: boolean }) {
  const pw = usePowerups()
  if (pw.isLoading) return <PanelSkeleton />
  const data = pw.data
  const pe = data?.pointsEarned ?? null
  const chosen = (data?.darkHorse ? 1 : 0) + (data?.disappointment ? 1 : 0)
  const value = locked && pe ? `${signed(pe.total)} pts` : `${chosen}/2 elegidos`

  return (
    <div className="space-y-3">
      <PhaseSummary label="Pálpitos" value={value} />
      <PowerupCard
        kind="dark"
        label="La revelación"
        team={data?.darkHorse ?? null}
        rounds={locked && pe ? pe.dark_horse_rounds_advanced : null}
        points={locked && pe ? pe.pts_dark_horse_per_round : null}
      />
      <PowerupCard
        kind="down"
        label="La decepción"
        team={data?.disappointment ?? null}
        rounds={locked && pe ? pe.disappointment_rounds_advanced : null}
        points={locked && pe ? pe.pts_disappointment_per_round : null}
      />
    </div>
  )
}

function PowerupCard({
  kind,
  label,
  team,
  rounds,
  points,
}: {
  kind: 'dark' | 'down'
  label: string
  team: PowerupTeam | null
  rounds: number | null
  points: number | null
}) {
  return (
    <Link
      to="/predicciones/powerups"
      aria-label={`Editar ${label}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-card active:scale-[0.99]"
    >
      <span className={`grid size-9 place-items-center rounded-[10px] ${kind === 'dark' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
        {kind === 'dark' ? <TrendUp size={18} weight="bold" /> : <TrendDown size={18} weight="bold" />}
      </span>
      <span className="flex-1">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
        <span className="block text-sm font-bold text-ink">{team?.name ?? '—'}</span>
        {team?.stats?.chosenPct != null && (
          <span className="block text-xs text-ink-soft">{Math.round(team.stats.chosenPct)}% lo eligió igual</span>
        )}
        {rounds != null && <span className="block text-xs text-ink-soft">Avanzó {rounds} rondas</span>}
      </span>
      {points != null && (
        <span className={`font-mono text-sm font-bold ${kind === 'dark' ? 'text-success' : 'text-danger'}`}>{signed(points)}</span>
      )}
    </Link>
  )
}
