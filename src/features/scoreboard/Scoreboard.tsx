import { memo, useState } from 'react'
import { useScoreboard } from './hooks'
import { useAuth } from '../../auth/useAuth'
import type { ScoreboardEntry } from '../../types/api'
import { Avatar } from '../../ui/Avatar'
import { displayName } from '../../lib/names'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { Podium } from './Podium'
import { PlayerBreakdown } from './PlayerBreakdown'
import { ScoreboardEmpty } from './states/ScoreboardEmpty'
import { pointsFor, type PointsView } from './points'
import { NAVY_BG } from './theme'

// El podio solo se muestra con un top 3 inequívoco: el BE comparte rank en empates (1,1,3…),
// así que hay empate si los 3 primeros repiten rank o un 4º comparte el rank del 3º.
function tieInTop(entries: ScoreboardEntry[]): boolean {
  const top = entries.slice(0, 3)
  if (new Set(top.map((e) => e.rank)).size !== top.length) return true
  return entries.length > 3 && entries[3].rank === top[2]?.rank
}

export function Scoreboard() {
  const [view, setView] = useState<PointsView>('provisional')
  // El orden y el rank los decide el backend: la vista oficial pide sortBy=real.
  const q = useScoreboard(view === 'official' ? 'real' : 'total')
  const { participant } = useAuth()
  const meId = participant?.id ?? null
  const [selected, setSelected] = useState<ScoreboardEntry | null>(null)

  if (q.isLoading) return <ScoreboardSkeleton />
  if (q.error) return <ScoreboardError onRetry={() => q.refetch()} />

  const data = q.data?.data ?? []
  const allZero = data.every((e) => e.total === 0)
  if (data.length === 0 || allZero) return <ScoreboardEmpty entries={data} meId={meId} />

  // Con empate en la punta no hay podio: la vista cae a lista plana (como "Todos en 0"),
  // porque los pedestales 1-2-3 contradirían los ranks compartidos (1,1,3…) del backend.
  const tied = tieInTop(data)
  const top3 = tied ? [] : data.slice(0, 3)
  const rest = tied ? data : data.slice(3)

  return (
    <div className="-mx-5 -mt-3">
      <div className="px-5 pb-7 pt-5 text-white" style={{ background: NAVY_BG }}>
        <h1 className="font-display text-2xl font-black">Tabla</h1>
        {q.data && (
          <p className="font-mono text-[10.5px] tracking-wide text-violet-light">ACTUALIZADO {formatUpdated(q.data.updatedAt)}</p>
        )}
        <PointsToggle view={view} onChange={setView} />
        <p className="mt-2 text-[11px] leading-snug text-violet-light">
          {view === 'provisional'
            ? 'Puntos provisionales — se confirman al cerrar cada grupo.'
            : 'Puntos oficiales — solo lo confirmado al cerrar cada grupo o partido.'}
        </p>
        {!tied && (
          <div className="mt-5">
            <Podium entries={top3} meId={meId} onPick={setSelected} view={view} />
          </div>
        )}
      </div>

      <div className="-mt-4 rounded-t-[22px] bg-bg px-5 pt-5">
        {rest.length > 0 && (
          <p className="mb-2 font-mono text-[10.5px] font-bold tracking-wide text-muted">
            {tied ? 'EMPATE EN LA PUNTA' : 'DEMÁS JUGADORES'}
          </p>
        )}
        <ul className="space-y-2">
          {rest.map((e) => (
            <ScoreboardRow key={e.participant.id} entry={e} meId={meId} onPick={setSelected} view={view} />
          ))}
        </ul>
      </div>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} ariaLabel={selected ? displayName(selected.participant.name) : undefined}>
        {selected && <PlayerBreakdown participantId={selected.participant.id} rank={selected.rank} />}
      </Sheet>
    </div>
  )
}

function PointsToggle({ view, onChange }: { view: PointsView; onChange: (v: PointsView) => void }) {
  const opts: [PointsView, string][] = [
    ['provisional', 'Provisionales'],
    ['official', 'Oficiales'],
  ]
  return (
    <div className="mt-3 inline-flex rounded-full bg-white/10 p-0.5" role="group" aria-label="Tipo de puntos">
      {opts.map(([key, label]) => {
        const active = view === key
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`rounded-full px-3.5 py-1 font-display text-xs font-bold transition ${
              active ? 'bg-white text-ink' : 'text-violet-light'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

const ScoreboardRow = memo(function ScoreboardRow({
  entry,
  meId,
  onPick,
  view,
}: {
  entry: ScoreboardEntry
  meId: string | null
  onPick: (e: ScoreboardEntry) => void
  view: PointsView
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
        <span className="flex-1 font-display font-bold text-ink">{displayName(entry.participant.name)}</span>
        {isMe && (
          <span className="rounded-full border border-violet bg-surface px-2 py-0.5 font-display text-[10px] font-bold text-violet">
            TÚ
          </span>
        )}
        <span className="font-mono text-sm font-bold text-ink">{pointsFor(entry, view)} pts</span>
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

