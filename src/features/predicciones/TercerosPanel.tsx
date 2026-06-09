import { Link } from 'react-router-dom'
import { useThirds } from '../groups/hooks'
import { useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import { Flag } from '../../ui/Flag'
import type { ThirdCandidate } from '../../types/api'

export function TercerosPanel({ locked }: { locked: boolean }) {
  const thirds = useThirds()
  const totals = useMyTotals()
  if (thirds.isLoading) return <PanelSkeleton />
  const selected = (thirds.data?.data ?? []).filter((c) => c.selected)
  const count = thirds.data?.selectedCount ?? 0
  const value = locked && totals.data ? `${signed(totals.data.breakdown.thirds)} pts` : `${count}/8 elegidos`

  return (
    <div className="space-y-3">
      <PhaseSummary label="Terceros" value={value} />
      {selected.length === 0 ? (
        <Link
          to="/predicciones/terceros"
          aria-label="Editar terceros"
          className="block rounded-card border border-dashed border-border bg-surface px-4 py-6 text-center text-muted"
        >
          Aún no has elegido tus 8 terceros
        </Link>
      ) : (
        <div className="space-y-2">
          {selected.map((c) => (
            <ThirdRow key={c.teamId} c={c} showResult={locked} />
          ))}
        </div>
      )}
    </div>
  )
}

function ThirdRow({ c, showResult }: { c: ThirdCandidate; showResult: boolean }) {
  const scored = showResult && c.pointsEarned != null
  const correct = scored && c.pointsEarned!.pts_third_correct > 0
  const tint = scored ? (correct ? 'bg-[#eaf6f0]' : 'bg-[#fdf4e7]') : 'bg-surface'
  return (
    <Link
      to="/predicciones/terceros"
      aria-label="Editar terceros"
      className={`flex items-center gap-3 rounded-card border border-border px-3 py-2.5 ${tint}`}
    >
      <Flag code={c.code} className="size-6" />
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">{c.name}</span>
        <span className="block text-xs text-ink-soft">Grupo {c.label}</span>
      </span>
      {scored &&
        (correct ? (
          <span className="rounded-full bg-[#d8efe3] px-2 py-0.5 font-mono text-[10px] font-bold text-success">Clasificó</span>
        ) : (
          <span className="rounded-full bg-[#f7e7cb] px-2 py-0.5 font-mono text-[10px] font-bold text-[#9a6a16]">No clasificó</span>
        ))}
    </Link>
  )
}
