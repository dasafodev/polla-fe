import { CaretRight, Check, LockSimple } from '@phosphor-icons/react'
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
          <div className="mb-1.5 px-1">
            <h3 className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">{col.name}</h3>
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

function TeamSide({ team, score, winner, dim }: { team: KoTeam; score: number | null; winner: boolean; dim?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Flag code={team.code} flag={team.flag} className="size-6" />
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          dim ? 'font-medium text-muted' : winner ? 'font-extrabold text-ink' : 'font-medium text-ink-soft'
        }`}
      >
        {team.name}
      </span>
      <span className={`w-5 shrink-0 text-center font-mono text-base font-bold tabular-nums ${dim ? 'text-muted' : 'text-ink'}`}>
        {score ?? '–'}
      </span>
    </div>
  )
}

// Chip de acierto: verde, icono + texto (nunca color solo). Solo aparece si ese componente sumó.
function HitChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ee] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-success">
      <Check size={11} weight="bold" />
      {label}
    </span>
  )
}

// Dos zonas: arriba "Tu pronóstico" (tu marcador), y solo en estado resuelto una franja inferior con
// el "Resultado real" + aciertos + puntos anclados. Así el real no se confunde con el pronóstico.
function MatchCard({ m, locked, onPick }: { m: KoMatch; locked: boolean; onPick: (m: KoMatch) => void }) {
  const home = m.homeTeam!
  const away = m.awayTeam!
  const mp = m.myPrediction
  const pe = mp?.pointsEarned
  const scored = locked && m.result != null && pe != null
  // Editable según el candado del propio partido (igual que el sheet), no el lock global del panel.
  const editable = !m.locked && m.status !== 'finished'
  const advId = mp?.teamAdvancesId

  const total = pe?.total ?? 0
  // Aciertos derivados del pronóstico vs resultado (igual que el detalle), NO de los puntos: con
  // "Triple o nada" busteado el total queda en 0 aunque el avance fuera correcto. Así card y detalle
  // no se contradicen ("Avanza" acá vs "Acertaste" allá).
  const gotAdvance = scored && mp!.teamAdvancesId === m.result!.winnerTeamId
  const gotExact = scored && mp!.scoreHome === m.result!.scoreHome && mp!.scoreAway === m.result!.scoreAway
  const pointsClass = total > 0 ? 'bg-[#e6f4ee] text-success' : 'bg-surface-2 text-ink-soft'

  return (
    <button
      type="button"
      onClick={() => onPick(m)}
      aria-label={`${home.name} vs ${away.name}`}
      className="block w-full overflow-hidden rounded-card border border-border bg-surface text-left shadow-card active:scale-[0.98]"
    >
      {/* ── Zona 1: tu pronóstico ── */}
      <div className="flex items-stretch gap-3 px-3 pb-2 pt-2.5">
        <div className="min-w-0 flex-1">
          {mp && (
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-soft">Tu pronóstico</span>
              {mp.tripleActive && (
                <span className="inline-flex items-center rounded-full bg-[#f6eed9] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-gold">
                  Triple ×3
                </span>
              )}
            </div>
          )}

          <div className="space-y-1">
            <TeamSide team={home} score={mp?.scoreHome ?? null} winner={advId === home.id} dim={!mp} />
            <TeamSide team={away} score={mp?.scoreAway ?? null} winner={advId === away.id} dim={!mp} />
          </div>

          {!mp && !editable && (
            <p className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-ink-soft">Cerrado · sin pronóstico</p>
          )}
        </div>

        {/* Afordancia derecha (en resuelto se omite: la franja inferior cierra la jerarquía). */}
        {!scored && (
          <div className="flex shrink-0 items-center">
            {!mp ? (
              editable ? (
                <span className="grid size-8 place-items-center rounded-full bg-tint text-violet">
                  <CaretRight size={16} weight="bold" />
                </span>
              ) : (
                <LockSimple size={16} weight="bold" className="text-muted" />
              )
            ) : (
              <CaretRight size={18} weight="bold" className="text-muted" />
            )}
          </div>
        )}
      </div>

      {/* ── Zona 2: resultado real + aciertos + puntos (solo resuelto) ── */}
      {scored && (
        <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-2 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex shrink-0 flex-col leading-tight">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-soft">Resultado real</span>
              <span className="font-mono text-base font-bold tabular-nums text-ink">
                {m.result!.scoreHome}–{m.result!.scoreAway}
              </span>
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {gotAdvance && <HitChip label="Avanza" />}
              {gotExact && <HitChip label="Exacto" />}
              {!gotAdvance && !gotExact && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink-soft">Sin acierto</span>
              )}
            </span>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-base font-extrabold tabular-nums ${pointsClass}`}>
            {signed(total)}
          </span>
        </div>
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
