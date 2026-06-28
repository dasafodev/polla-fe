import { useState } from 'react'
import { useGroups, useMyGroupPredictions } from '../groups/hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton, RankingRow, ConsensusLegend } from './parts'
import { GroupEditSheet } from './GroupEditSheet'
import { rankingsWithResult, exactPointValue } from './groupResults'
import type { GroupPrediction, GroupRanking } from '../../types/api'

export function GruposPanel({ locked }: { locked: boolean }) {
  const groups = useMyGroupPredictions()
  const catalog = useGroups()
  const [openId, setOpenId] = useState<string | null>(null)
  if (groups.isLoading) return <PanelSkeleton />
  const list = groups.data?.data ?? []
  const completed = groups.data?.completedGroups ?? 0
  const value = `${completed}/12 completos`
  const hasConsensus = list.some((g) => g.rankings.some((r) => r.consensusPct != null))
  const catalogById = new Map((catalog.data?.data ?? []).map((g) => [g.id, g]))

  // El acierto (EXACTO) y su valor en puntos se derivan de la tabla real; el backend no los envía.
  const withResults = list.map((g) => ({ g, rankings: rankingsWithResult(g.rankings, catalogById.get(g.groupId)) }))
  const exactPoints = exactPointValue(withResults.map(({ g, rankings }) => ({ rankings, pointsEarned: g.pointsEarned })))

  return (
    <div className="space-y-3">
      <PhaseSummary label="Grupos" value={value} />
      {hasConsensus && <ConsensusLegend kind="groups" />}
      {withResults.map(({ g, rankings }) => (
        <GroupRow key={g.groupId} g={g} rankings={rankings} exactPoints={exactPoints} locked={locked} onOpen={setOpenId} />
      ))}
      <GroupEditSheet groupId={openId} locked={locked} onClose={() => setOpenId(null)} />
    </div>
  )
}

function GroupRow({ g, rankings, exactPoints, locked, onOpen }: {
  g: GroupPrediction; rankings: GroupRanking[]; exactPoints: number | null; locked: boolean; onOpen: (groupId: string) => void
}) {
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
        <RankingRow key={r.teamId} r={r} index={i} exactPoints={exactPoints} />
      ))}
    </button>
  )
}
