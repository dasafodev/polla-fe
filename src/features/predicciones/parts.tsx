import { Users } from '@phosphor-icons/react'
import { Flag } from '../../ui/Flag'
import type { GroupRanking, TeamStanding } from '../../types/api'

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

// Solo se resalta el acierto exacto (verde). El badge muestra los puntos que ese acierto suma
// (+N) en vez de la palabra "EXACTO"; si aún no se conoce el valor, cae a un check.
export function RankingRow({ r, index, exactPoints }: { r: GroupRanking; index: number; exactPoints?: number | null }) {
  const top = index < 2
  const isExact = r.result === 'exact'
  const tint = isExact ? 'bg-[#eaf6f0]' : ''
  const posClass = isExact
    ? 'bg-success text-white'
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
      {isExact && (
        <span className="rounded-full bg-[#d8efe3] px-2 py-0.5 font-mono text-[10px] font-bold text-success">
          {exactPoints != null ? `+${exactPoints}` : '✓'}
        </span>
      )}
    </div>
  )
}

export interface RealTableRow { code: string; flag: string | null; standing: TeamStanding }

// Mini-tabla real del grupo (datos de standing en GET /groups), debajo del pronóstico.
export function GroupRealTable({ rows }: { rows: RealTableRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="mt-2 rounded-lg bg-surface-2 px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">Tabla real</span>
        <span className="font-mono text-[10px] text-muted">PJ · DIF · PTS</span>
      </div>
      {rows.map((r) => {
        const gd = r.standing.goalDiff
        return (
          <div key={r.code} className="flex items-center gap-2 py-0.5">
            <span className="w-4 text-center font-mono text-[11px] font-bold text-ink-soft">{r.standing.realPosition ?? '–'}</span>
            <Flag code={r.code} flag={r.flag} className="size-4" />
            <span className="flex-1 text-xs font-medium text-ink">{r.code}</span>
            <span className="font-mono text-[11px] text-muted">{`${r.standing.matchesPlayed} · ${gd > 0 ? `+${gd}` : gd}`}</span>
            <span className="w-6 text-right font-mono text-[11px] font-bold text-ink">{r.standing.pts}</span>
          </div>
        )
      })}
    </div>
  )
}
