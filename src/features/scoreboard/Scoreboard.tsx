import { memo, useState } from 'react'
import { useScoreboard } from './hooks'
import { useAuth } from '../../auth/useAuth'
import type { ScoreboardEntry } from '../../types/api'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { Podium } from './Podium'
import { PlayerBreakdown } from './PlayerBreakdown'
import { ScoreboardEmpty } from './states/ScoreboardEmpty'
import { NAVY_BG } from './theme'

export function Scoreboard() {
  const q = useScoreboard()
  const { participant } = useAuth()
  const meId = participant?.id ?? null
  const [selected, setSelected] = useState<ScoreboardEntry | null>(null)

  if (q.isLoading) return <ScoreboardSkeleton />
  if (q.error) return <ScoreboardError onRetry={() => q.refetch()} />

  const data = q.data?.data ?? []
  const allZero = data.every((e) => e.total === 0)
  if (data.length === 0 || allZero) return <ScoreboardEmpty entries={data} meId={meId} />

  // El backend solo trae el top; si quedo fuera me anexa al final con mi rank real (hueco de posiciones).
  const hasGap = data.length >= 2 && data[data.length - 1].rank > data[data.length - 2].rank + 1
  const outsider = hasGap ? data[data.length - 1] : null
  const ranked = hasGap ? data.slice(0, -1) : data
  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  return (
    <div className="-mx-5 -mt-3">
      <div className="px-5 pb-7 pt-5 text-white" style={{ background: NAVY_BG }}>
        <h1 className="font-display text-2xl font-black">Tabla</h1>
        {q.data && (
          <p className="font-mono text-[10.5px] tracking-wide text-violet-light">ACTUALIZADO {formatUpdated(q.data.updatedAt)}</p>
        )}
        <div className="mt-5">
          <Podium entries={top3} meId={meId} onPick={setSelected} />
        </div>
      </div>

      <div className="-mt-4 rounded-t-[22px] bg-bg px-5 pt-5">
        {(rest.length > 0 || outsider) && (
          <p className="mb-2 font-mono text-[10.5px] font-bold tracking-wide text-muted">DEMÁS JUGADORES</p>
        )}
        <ul className="space-y-2">
          {rest.map((e) => (
            <ScoreboardRow key={e.participant.id} entry={e} meId={meId} onPick={setSelected} />
          ))}
          {outsider && (
            <>
              <li aria-hidden="true" data-testid="rank-gap" className="flex justify-center py-0.5 text-muted">
                <span className="font-mono text-lg leading-none tracking-[0.45em]">···</span>
              </li>
              <ScoreboardRow key={outsider.participant.id} entry={outsider} meId={meId} onPick={setSelected} />
            </>
          )}
        </ul>
      </div>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} ariaLabel={selected?.participant.name}>
        {selected && <PlayerBreakdown participantId={selected.participant.id} rank={selected.rank} />}
      </Sheet>
    </div>
  )
}

const ScoreboardRow = memo(function ScoreboardRow({
  entry,
  meId,
  onPick,
}: {
  entry: ScoreboardEntry
  meId: string | null
  onPick: (e: ScoreboardEntry) => void
}) {
  const isMe = entry.participant.id === meId
  return (
    <li>
      <button
        onClick={() => onPick(entry)}
        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
          isMe ? 'border-violet bg-tint' : 'border-border bg-surface'
        }`}
      >
        <span className="w-5 text-center font-mono text-sm font-bold text-muted">{entry.rank}</span>
        <Avatar name={entry.participant.name} size={30} />
        <span className="flex-1 font-display font-bold text-ink">{entry.participant.name}</span>
        {isMe && (
          <span className="rounded-full border border-violet bg-surface px-2 py-0.5 font-display text-[10px] font-bold text-violet">
            TÚ
          </span>
        )}
        <span className="font-mono text-sm font-bold text-ink">{entry.total} pts</span>
      </button>
    </li>
  )
})

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function ScoreboardSkeleton() {
  return (
    <div className="-mx-5 -mt-3">
      <div className="px-5 pb-7 pt-5" style={{ background: NAVY_BG }}>
        <div className="h-7 w-24 animate-pulse rounded bg-white/10" aria-busy />
        <div className="mt-5 flex items-end justify-center gap-2.5">
          <div className="h-[70px] flex-1 animate-pulse rounded-t-[14px] bg-white/10" />
          <div className="h-[96px] flex-1 animate-pulse rounded-t-[14px] bg-white/10" />
          <div className="h-[52px] flex-1 animate-pulse rounded-t-[14px] bg-white/10" />
        </div>
      </div>
      <div className="-mt-4 rounded-t-[22px] bg-bg px-5 pt-5">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ScoreboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <p className="text-ink-soft">No pudimos cargar la tabla.</p>
      <Button className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

