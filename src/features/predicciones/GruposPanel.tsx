import { useState } from 'react'
import { useGroups, useMyGroupPredictions } from '../groups/hooks'
import { useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton, RankingRow, ConsensusLegend, GroupRealTable, type RealTableRow } from './parts'
import { GroupEditSheet } from './GroupEditSheet'
import { rankingsWithResult } from './groupResults'
import type { Group, GroupPrediction } from '../../types/api'

export function GruposPanel({ locked }: { locked: boolean }) {
  const groups = useMyGroupPredictions()
  const catalog = useGroups()
  const totals = useMyTotals()
  const [openId, setOpenId] = useState<string | null>(null)
  if (groups.isLoading) return <PanelSkeleton />
  const list = groups.data?.data ?? []
  const completed = groups.data?.completedGroups ?? 0
  const value = locked && totals.data ? `${signed(totals.data.breakdown.groups)} pts` : `${completed}/12 completos`
  const hasConsensus = list.some((g) => g.rankings.some((r) => r.consensusPct != null))
  const catalogById = new Map((catalog.data?.data ?? []).map((g) => [g.id, g]))

  return (
    <div className="space-y-3">
      <PhaseSummary label="Grupos" value={value} />
      {hasConsensus && <ConsensusLegend kind="groups" />}
      {list.map((g) => (
        <GroupRow
          key={g.groupId}
          g={g}
          locked={locked}
          onOpen={setOpenId}
          catalogGroup={catalogById.get(g.groupId)}
        />
      ))}
      <GroupEditSheet groupId={openId} locked={locked} onClose={() => setOpenId(null)} />
    </div>
  )
}

// La tabla real sale del standing embebido en GET /groups (la actualiza el cron del BE cada 5 min).
function realTableFor(group: Group | undefined): RealTableRow[] | null {
  if (!group) return null
  const rows = group.teams
    .filter((t) => t.standing != null)
    .map((t) => ({ code: t.code, flag: t.flag, standing: t.standing! }))
    .sort((a, b) => (a.standing.realPosition ?? 99) - (b.standing.realPosition ?? 99))
  return rows.length > 0 ? rows : null
}

function GroupRow({ g, locked, onOpen, catalogGroup }: {
  g: GroupPrediction; locked: boolean; onOpen: (groupId: string) => void; catalogGroup: Group | undefined
}) {
  const realTable = locked ? realTableFor(catalogGroup) : null
  // El acierto por equipo (EXACTO/PARCIAL) se calcula desde la tabla real; el backend no lo envía.
  const rankings = rankingsWithResult(g.rankings, catalogGroup)
  if (!g.groupComplete) {
    return (
      <button
        type="button"
        onClick={() => onOpen(g.groupId)}
        aria-label={`Ordenar ${g.name}`}
        className="flex w-full items-center justify-between rounded-card border border-dashed border-border bg-surface px-4 py-3.5 text-left active:scale-[0.99]"
      >
        <span className="font-display font-bold text-ink">{g.name}</span>
        <span className="text-sm font-medium text-muted">Sin ordenar</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(g.groupId)}
      aria-label={`Editar ${g.name}`}
      className="block w-full rounded-card border border-border bg-surface p-3 text-left shadow-card active:scale-[0.99]"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-display text-sm font-extrabold text-ink">{g.name}</span>
        {locked && g.pointsEarned && (
          <span className="rounded-full bg-tint px-2 py-0.5 font-mono text-xs font-bold text-violet-strong">
            {signed(g.pointsEarned.total)}
          </span>
        )}
      </div>
      {rankings.map((r, i) => (
        <RankingRow key={r.teamId} r={r} index={i} />
      ))}
      {realTable && <GroupRealTable rows={realTable} />}
    </button>
  )
}
