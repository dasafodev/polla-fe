import { Users } from '@phosphor-icons/react'
import { Flag } from '../../ui/Flag'
import type { GroupRanking } from '../../types/api'

export function ConsensusLegend({ kind }: { kind: 'groups' | 'powerups' }) {
  const who = kind === 'groups' ? 'de la polla que coincidió contigo' : 'que eligió lo mismo que tú'
  return (
    <div className="flex items-start gap-1.5 rounded-lg bg-surface-2 px-2.5 py-2 text-[11px] text-muted">
      <Users size={13} weight="bold" className="mt-px shrink-0" />
      <span>% de jugadores {who} — mientras más alto, más popular tu elección.</span>
    </div>
  )
}

export function PhaseSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="font-mono text-sm font-bold text-ink">{value}</span>
    </div>
  )
}

export function PanelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-card bg-surface-2" aria-busy />
      ))}
    </div>
  )
}

export function RankingRow({ r, index }: { r: GroupRanking; index: number }) {
  const top = index < 2
  const result = r.result
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
      <Flag code={r.code} flag={r.flag} className="size-4" />
      <span className="flex-1 text-sm font-medium text-ink">{r.name}</span>
      {r.consensusPct != null && (
        <span className="flex items-center gap-1 font-mono text-[11px] text-muted">
          <Users size={11} weight="bold" />
          {Math.round(r.consensusPct)}%
        </span>
      )}
      {result === 'exact' && (
        <span className="rounded-full bg-[#d8efe3] px-2 py-0.5 font-mono text-[10px] font-bold text-success">EXACTO</span>
      )}
      {result === 'partial' && (
        <span className="rounded-full bg-[#f7e7cb] px-2 py-0.5 font-mono text-[10px] font-bold text-[#9a6a16]">PARCIAL</span>
      )}
    </div>
  )
}
