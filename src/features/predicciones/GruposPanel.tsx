import { Link } from 'react-router-dom'
import { useMyGroupPredictions } from '../groups/hooks'
import { useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import { Flag } from '../../ui/Flag'
import type { GroupPrediction, GroupRanking } from '../../types/api'

export function GruposPanel({ locked }: { locked: boolean }) {
  const groups = useMyGroupPredictions()
  const totals = useMyTotals()
  if (groups.isLoading) return <PanelSkeleton />
  const list = groups.data?.data ?? []
  const completed = groups.data?.completedGroups ?? 0
  const value = locked && totals.data ? `${signed(totals.data.breakdown.groups)} pts` : `${completed}/12 completos`

  return (
    <div className="space-y-3">
      <PhaseSummary label="Grupos" value={value} />
      {list.map((g) => (
        <GroupRow key={g.groupId} g={g} locked={locked} />
      ))}
    </div>
  )
}

function GroupRow({ g, locked }: { g: GroupPrediction; locked: boolean }) {
  if (!g.groupComplete) {
    return (
      <Link
        to="/predicciones/grupos"
        aria-label={`Ordenar ${g.name}`}
        className="flex items-center justify-between rounded-card border border-dashed border-border bg-surface px-4 py-3.5"
      >
        <span className="font-display font-bold text-ink">{g.name}</span>
        <span className="text-sm font-medium text-muted">Sin ordenar</span>
      </Link>
    )
  }
  return (
    <Link
      to="/predicciones/grupos"
      aria-label={`Editar ${g.name}`}
      className="block rounded-card border border-border bg-surface p-3 shadow-card active:scale-[0.99]"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-display text-sm font-extrabold text-ink">{g.name}</span>
        {locked && g.pointsEarned && (
          <span className="rounded-full bg-tint px-2 py-0.5 font-mono text-xs font-bold text-violet-strong">
            {signed(g.pointsEarned.total)}
          </span>
        )}
      </div>
      {g.rankings.map((r, i) => (
        <RankingRow key={r.teamId} r={r} index={i} showResult={locked} />
      ))}
    </Link>
  )
}

function RankingRow({ r, index, showResult }: { r: GroupRanking; index: number; showResult: boolean }) {
  const top = index < 2
  const result = showResult ? r.result : null
  const tint = result === 'exact' ? 'bg-[#eaf6f0]' : result === 'partial' ? 'bg-[#fdf4e7]' : ''
  const posClass =
    result === 'exact'
      ? 'bg-success text-white'
      : result === 'partial'
        ? 'bg-[#e8a33d] text-white'
        : top
          ? 'bg-tint text-violet-strong'
          : 'bg-surface-2 text-ink-soft'
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 ${tint}`}>
      <span className={`grid size-5 place-items-center rounded-full font-mono text-[11px] font-bold ${posClass}`}>{r.position}</span>
      <Flag code={r.code} className="size-4" />
      <span className="flex-1 text-sm font-medium text-ink">{r.name}</span>
      {result === 'exact' && (
        <span className="rounded-full bg-[#d8efe3] px-2 py-0.5 font-mono text-[10px] font-bold text-success">EXACTO</span>
      )}
      {result === 'partial' && (
        <span className="rounded-full bg-[#f7e7cb] px-2 py-0.5 font-mono text-[10px] font-bold text-[#9a6a16]">PARCIAL</span>
      )}
    </div>
  )
}
