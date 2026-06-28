import { CaretRight } from '@phosphor-icons/react'
import { Flag } from '../../ui/Flag'
import { signed } from '../predicciones/format'
import { isDetermined, sideLabel, type KoColumn, type KoSlot } from './koView'
import type { KoMatch, KoTeam } from '../../types/api'

// Vista "fácil" tipo lista: una sección por ronda (R32→Final), cada partido en una fila.
// Los cruces ya definidos abren el sheet de pronóstico; los no definidos se marcan "Por definir".
export function KoListView({
  columns,
  locked,
  onPick,
}: {
  columns: KoColumn[]
  locked: boolean
  onPick: (m: KoMatch) => void
}) {
  return (
    <div className="space-y-5">
      {columns.map((col) => (
        <section key={col.slug}>
          <div className="mb-1.5 flex items-center justify-between px-1">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">{col.name}</h3>
            {locked && col.points > 0 && <span className="font-mono text-xs font-bold text-violet">{signed(col.points)}</span>}
          </div>
          <div className="space-y-2">
            {col.slots.map((slot) =>
              slot.match && isDetermined(slot.match) ? (
                <MatchCard key={slot.match.id} m={slot.match} locked={locked} onPick={onPick} />
              ) : (
                <UndefinedRow key={slot.match?.id ?? `${col.slug}-${slot.index}`} slot={slot} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  )
}

function TeamSide({ team, score, win }: { team: KoTeam; score: number | null; win: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Flag code={team.code} flag={team.flag} className="size-6" />
      <span className={`flex-1 truncate text-sm ${win ? 'font-extrabold text-ink' : 'font-medium text-ink-soft'}`}>{team.name}</span>
      <span className="w-5 text-center font-mono text-base font-bold tabular-nums text-ink">{score ?? '–'}</span>
    </div>
  )
}

function MatchCard({ m, locked, onPick }: { m: KoMatch; locked: boolean; onPick: (m: KoMatch) => void }) {
  const home = m.homeTeam!
  const away = m.awayTeam!
  const mp = m.myPrediction
  const pe = mp?.pointsEarned
  const scored = locked && m.result != null && pe != null
  const advId = mp?.teamAdvancesId
  return (
    <button
      type="button"
      onClick={() => onPick(m)}
      aria-label={`${home.name} vs ${away.name}`}
      className="flex w-full items-center gap-3 rounded-card border border-border bg-surface px-3 py-2.5 text-left shadow-card active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <TeamSide team={home} score={mp?.scoreHome ?? null} win={advId === home.id} />
        <TeamSide team={away} score={mp?.scoreAway ?? null} win={advId === away.id} />
        <p className="truncate text-[11px] text-muted">
          {mp ? (
            scored && m.result ? (
              <>
                Real {m.result.scoreHome}–{m.result.scoreAway}
                {pe!.pts_ko_advances > 0 ? ' · acertó quién avanza' : ''}
                {pe!.pts_ko_exact_score > 0 ? ' · exacto' : ''}
              </>
            ) : (
              <>Tu pronóstico{mp.tripleActive ? ' · triple o nada' : ''}</>
            )
          ) : m.status === 'finished' || m.locked ? (
            'Cerrado · sin pronóstico'
          ) : (
            'Toca para pronosticar'
          )}
        </p>
      </div>
      {scored ? (
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-bold ${pe!.total > 0 ? 'bg-[#e6f4ee] text-success' : 'bg-surface-2 text-muted'}`}>
          {signed(pe!.total)}
        </span>
      ) : mp?.tripleActive ? (
        <span className="shrink-0 rounded bg-[#f6eed9] px-1.5 py-0.5 font-mono text-[10px] font-bold text-gold">×3</span>
      ) : (
        <CaretRight size={16} weight="bold" className="shrink-0 text-muted" />
      )}
    </button>
  )
}

// Fila de cruce sin definir: muestra los rótulos disponibles (o "Por definir") y no es interactiva.
function UndefinedRow({ slot }: { slot: KoSlot }) {
  const home = slot.match ? sideLabel(slot.match, 'home') : 'Por definir'
  const away = slot.match ? sideLabel(slot.match, 'away') : 'Por definir'
  return (
    <div className="flex items-center gap-3 rounded-card border border-dashed border-border bg-surface-2/60 px-3 py-2.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-bold text-muted">?</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-muted">{home}</span>
        <span className="block truncate text-sm font-medium text-muted">{away}</span>
      </span>
      <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">Por definir</span>
    </div>
  )
}
