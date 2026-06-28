import { ArrowRight } from '@phosphor-icons/react'
import { Flag } from '../../ui/Flag'
import { signed } from '../predicciones/format'
import { isDetermined, sideLabel, type KoColumn, type KoSlot } from './koView'
import type { KoMatch, KoTeam } from '../../types/api'

// Vista de llaves: las rondas como columnas (16avos→Final) en un carril con scroll horizontal,
// ya que el cuadro completo de 48 no cabe en una pantalla móvil. Cada partido definido abre el sheet.
export function KoBracketView({
  columns,
  locked,
  onPick,
}: {
  columns: KoColumn[]
  locked: boolean
  onPick: (m: KoMatch) => void
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1 px-1 text-[11px] font-medium text-muted">
        Desliza para ver todas las rondas <ArrowRight size={12} weight="bold" />
      </p>
      {/* -mx-5/px-5: el carril ocupa todo el ancho del shell pero mantiene el padding de borde. */}
      <div className="-mx-5 overflow-x-auto px-5 pb-2">
        <div className="flex gap-3">
          {columns.map((col) => (
            <section key={col.slug} className="w-[156px] shrink-0">
              <div className="mb-2">
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-wide text-violet-strong">{col.short}</h3>
              </div>
              <div className="space-y-2">
                {col.slots.map((slot) =>
                  slot.match && isDetermined(slot.match) ? (
                    <BracketCard key={slot.match.id} m={slot.match} locked={locked} onPick={onPick} />
                  ) : (
                    <UndefinedCard key={slot.match?.id ?? `${col.slug}-${slot.index}`} slot={slot} />
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function Side({ team, score, win }: { team: KoTeam; score: number | null; win: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1.5 ${win ? 'bg-tint' : ''}`}>
      <Flag code={team.code} flag={team.flag} className="size-4" />
      <span className={`flex-1 truncate text-xs ${win ? 'font-extrabold text-violet-strong' : 'font-semibold text-ink'}`}>{team.code}</span>
      <span className="w-3 text-center font-mono text-xs font-bold tabular-nums text-ink-soft">{score ?? '·'}</span>
    </div>
  )
}

function BracketCard({ m, locked, onPick }: { m: KoMatch; locked: boolean; onPick: (m: KoMatch) => void }) {
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
      className="block w-full overflow-hidden rounded-xl border border-border bg-surface text-left shadow-card active:scale-[0.98]"
    >
      <Side team={home} score={mp?.scoreHome ?? null} win={advId === home.id} />
      <div className="h-px bg-border" />
      <Side team={away} score={mp?.scoreAway ?? null} win={advId === away.id} />
      <div className="flex items-center justify-between border-t border-border bg-surface-2 px-2 py-1">
        {m.status === 'live' ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-danger">
            <span className="size-1.5 rounded-full bg-danger" /> EN VIVO
          </span>
        ) : scored ? (
          <span className={`font-mono text-[10px] font-bold ${pe!.total > 0 ? 'text-success' : 'text-muted'}`}>{signed(pe!.total)} pts</span>
        ) : mp ? (
          <span className="text-[10px] font-medium text-violet">{mp.tripleActive ? 'Triple ×3' : 'Pronosticado'}</span>
        ) : m.status === 'finished' || m.locked ? (
          <span className="text-[10px] font-medium text-muted">Cerrado</span>
        ) : (
          <span className="text-[10px] font-medium text-ink-soft">Pronosticar</span>
        )}
      </div>
    </button>
  )
}

function UndefinedCard({ slot }: { slot: KoSlot }) {
  const home = slot.match ? sideLabel(slot.match, 'home') : 'Por definir'
  const away = slot.match ? sideLabel(slot.match, 'away') : 'Por definir'
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-2/60 px-2 py-1.5">
      <p className="truncate text-[11px] font-medium text-muted">{home}</p>
      <div className="my-1 h-px bg-border" />
      <p className="truncate text-[11px] font-medium text-muted">{away}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-muted">Por definir</p>
    </div>
  )
}
