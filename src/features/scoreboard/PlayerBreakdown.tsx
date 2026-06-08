import { type ReactNode } from 'react'
import { SquaresFour, Sword, Medal, Horse, TrendDown } from '@phosphor-icons/react'
import { useBreakdown } from './hooks'
import { Avatar } from '../../ui/Avatar'
import { formatCOP } from './format'

export function PlayerBreakdown({ participantId, rank }: { participantId: string; rank?: number }) {
  const q = useBreakdown(participantId)
  if (q.isLoading) return <BreakdownSkeleton />
  if (q.error || !q.data) {
    return (
      <p role="alert" className="px-4 py-8 text-center text-danger">
        No se pudo cargar el desglose.
      </p>
    )
  }
  const b = q.data
  const bd = b.breakdown
  const maxPos = Math.max(1, bd.groups, bd.ko, bd.thirds, bd.darkHorse)
  const topRank = rank != null && rank <= 3

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-3 pt-1">
        <Avatar name={b.participant.name} size={46} />
        <div className="flex-1">
          <p className="font-display text-lg font-extrabold text-ink">{b.participant.name}</p>
          {rank != null && (
            <span
              className={`inline-block rounded-full border px-2 py-0.5 font-mono text-xs font-bold ${
                topRank ? 'border-gold text-gold' : 'border-border text-ink-soft'
              }`}
            >
              #{rank}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold leading-none text-ink">{b.total}</p>
          <p className="text-xs text-ink-soft">puntos</p>
        </div>
      </div>

      {b.prize != null && (
        <div className="mt-3 flex items-center gap-2 rounded-control border border-gold/30 bg-[#f8f2e4] px-3 py-2.5">
          <span className="font-display font-bold text-ink">Premio</span>
          <span className="ml-auto font-mono font-bold text-gold">{formatCOP(b.prize)}</span>
        </div>
      )}

      <p className="px-1 pb-1 pt-4 font-mono text-[10.5px] font-bold tracking-wide text-muted">
        DE DÓNDE SALEN SUS PUNTOS
      </p>

      <CategoryRow icon={<SquaresFour size={18} weight="bold" />} label="Grupos" display={`${bd.groups}`} pct={(bd.groups / maxPos) * 100} />
      <CategoryRow icon={<Sword size={18} weight="bold" />} label="Eliminatorias" display={`${bd.ko}`} pct={(bd.ko / maxPos) * 100} />
      <CategoryRow icon={<Medal size={18} weight="bold" />} label="Terceros" display={`${bd.thirds}`} pct={(bd.thirds / maxPos) * 100} />
      <CategoryRow
        icon={<Horse size={18} weight="bold" />}
        label="Caballo oscuro"
        display={bd.darkHorse > 0 ? `+${bd.darkHorse}` : `${bd.darkHorse}`}
        pct={(Math.max(0, bd.darkHorse) / maxPos) * 100}
      />

      <div className="my-2 h-px bg-border" />

      <div className="flex items-center gap-3 py-2">
        <span className="grid size-9 place-items-center rounded-[10px] bg-[#fdeede] text-lock">
          <TrendDown size={18} weight="bold" />
        </span>
        <span className="flex-1 font-display font-bold text-ink">Decepción</span>
        <span className="w-16 text-right font-mono font-bold text-lock">{bd.disappointment}</span>
      </div>
    </div>
  )
}

function CategoryRow({ icon, label, display, pct }: { icon: ReactNode; label: string; display: string; pct: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="grid size-9 place-items-center rounded-[10px] bg-tint text-violet">{icon}</span>
      <span className="flex-1">
        <span className="block font-display text-sm font-bold text-ink">{label}</span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full bg-violet-light"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </span>
      </span>
      <span className="w-16 text-right font-mono font-bold text-ink">{display}</span>
    </div>
  )
}

function BreakdownSkeleton() {
  return (
    <div className="px-4 pb-4 pt-2">
      <div className="h-12 animate-pulse rounded-2xl bg-surface-2" aria-busy />
      <div className="mt-3 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  )
}
