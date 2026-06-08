import { useState } from 'react'
import { useScoreboard } from './hooks'
import { useAuth } from '../../auth/useAuth'
import type { ScoreboardEntry } from '../../types/api'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { Podium } from './Podium'
import { PlayerBreakdown } from './PlayerBreakdown'

const NAVY_BG = 'radial-gradient(120% 80% at 50% -10%, #2a1d5e 0%, #150f33 55%, #0d0a22 100%)'

export function Scoreboard() {
  const q = useScoreboard()
  const { participant } = useAuth()
  const meId = participant?.id ?? null
  const [selected, setSelected] = useState<ScoreboardEntry | null>(null)

  if (q.isLoading) return <ScoreboardSkeleton />
  if (q.error) return <ScoreboardError onRetry={() => q.refetch()} />

  const data = q.data?.data ?? []
  const allZero = data.every((e) => e.total === 0)
  if (data.length === 0 || allZero) return <ScoreboardEmpty />

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)

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
        {rest.length > 0 && (
          <p className="mb-2 font-mono text-[10.5px] font-bold tracking-wide text-muted">DEMÁS JUGADORES</p>
        )}
        <ul className="space-y-2">
          {rest.map((e) => {
            const isMe = e.participant.id === meId
            return (
              <li key={e.participant.id}>
                <button
                  onClick={() => setSelected(e)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                    isMe ? 'border-violet bg-tint' : 'border-border bg-surface'
                  }`}
                >
                  <span className="w-5 text-center font-mono text-sm font-bold text-muted">{e.rank}</span>
                  <Avatar name={e.participant.name} size={30} />
                  <span className="flex-1 font-display font-bold text-ink">{e.participant.name}</span>
                  {isMe && (
                    <span className="rounded-full border border-violet bg-surface px-2 py-0.5 font-display text-[10px] font-bold text-violet">
                      TÚ
                    </span>
                  )}
                  <span className="font-mono text-sm font-bold text-ink">{e.total} pts</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} ariaLabel={selected?.participant.name}>
        {selected && <PlayerBreakdown participantId={selected.participant.id} rank={selected.rank} />}
      </Sheet>
    </div>
  )
}

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

function ScoreboardEmpty() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <h1 className="font-display text-xl font-extrabold text-ink">Tabla</h1>
      <p className="mt-2 text-ink-soft">La tabla se llena cuando empiecen los partidos.</p>
    </div>
  )
}
