import type { ReactNode } from 'react'
import { ArrowRight, Clock, Check } from '@phosphor-icons/react'
import { Flag } from '../../ui/Flag'
import { signed, formatKoKickoffShort } from '../predicciones/format'
import { isDetermined, sideLabel, type KoColumn, type KoSlot } from './koView'
import type { KoMatch, KoTeam } from '../../types/api'

// ── Geometría del cuadro ──────────────────────────────────────────────────────
// Las cards tienen ALTURA UNIFORME para que cada partido de una ronda quede centrado entre los dos
// que lo alimentan en la ronda anterior. El "pitch" (distancia entre centros de cards) se DUPLICA
// por ronda; con eso las líneas conectoras caen exactas sin medir el DOM (ver buildColumns 'bracket').
const CARD_H = 88 // alto fijo de cada card/cupo
const GAP0 = 8 // separación vertical base entre cards de la primera ronda (16avos)
const PITCH0 = CARD_H + GAP0
const COL_W = 150 // ancho de columna
const GAPX = 30 // separación horizontal entre columnas
const CONN = GAPX / 2 // medio camino: donde va el codo vertical que une el par

// Métricas de la ronda r (0 = 16avos): pitch, separación entre cards y desplazamiento de la primera
// card para centrar la columna respecto al árbol completo.
function colMetrics(r: number) {
  const pitch = PITCH0 * 2 ** r
  return { pitch, gap: pitch - CARD_H, offset: (pitch - PITCH0) / 2 }
}

// Vista de llaves: el cuadro como árbol con conectores que muestran qué partidos alimentan al
// siguiente. Carril con scroll horizontal (48 equipos no caben en una pantalla móvil). El 3er puesto
// se nutre de los PERDEDORES de semis, así que va aparte del árbol de ganadores.
export function KoBracketView({
  columns,
  locked,
  onPick,
}: {
  columns: KoColumn[]
  locked: boolean
  onPick: (m: KoMatch) => void
}) {
  const treeColumns = columns.filter((c) => c.slug !== '3rd') // r32→r16→qf→sf→final (árbol binario)
  const third = columns.find((c) => c.slug === '3rd')
  const lastTree = treeColumns.length - 1

  return (
    <div>
      <p className="mb-2 flex items-center gap-1 px-1 text-[11px] font-medium text-muted">
        Desliza para ver todas las rondas <ArrowRight size={12} weight="bold" />
      </p>
      {/* -mx-5/px-5: el carril ocupa todo el ancho del shell pero conserva el padding de borde.
          overflow-y-visible deja salir los conectores que viven en el espacio entre columnas. */}
      <div className="-mx-5 overflow-x-auto overflow-y-visible px-5 pb-2">
        <div className="flex" style={{ gap: GAPX }}>
          {treeColumns.map((col, r) => (
            <BracketColumn key={col.slug} col={col} round={r} isLast={r === lastTree} locked={locked} onPick={onPick} />
          ))}
          {third && (
            <>
              {/* Separador: el 3er puesto no forma parte del árbol de ganadores. */}
              <div className="w-px shrink-0 self-stretch bg-border" />
              <section className="shrink-0" style={{ width: COL_W }}>
                <ColumnHeader label={third.short} />
                <SlotBox>
                  {third.slots.map((slot) => (
                    <CardForSlot key={slotKey(slot)} slot={slot} locked={locked} onPick={onPick} />
                  ))}
                </SlotBox>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const slotKey = (slot: KoSlot) => slot.match?.id ?? `${slot.round}-${slot.index}`

function ColumnHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex h-5 items-center">
      <h3 className="font-mono text-[11px] font-bold uppercase tracking-wide text-violet-strong">{label}</h3>
    </div>
  )
}

// Caja de cupos de una ronda del árbol: posiciona cada card por su pitch y dibuja los conectores.
function BracketColumn({
  col,
  round,
  isLast,
  locked,
  onPick,
}: {
  col: KoColumn
  round: number
  isLast: boolean
  locked: boolean
  onPick: (m: KoMatch) => void
}) {
  const { pitch, gap, offset } = colMetrics(round)
  const lastIndex = col.slots.length - 1
  return (
    <section className="shrink-0" style={{ width: COL_W }}>
      <ColumnHeader label={col.short} />
      <SlotBox>
        {col.slots.map((slot, i) => (
          <div
            key={slotKey(slot)}
            className="relative"
            style={{ height: CARD_H, marginTop: i === 0 ? offset : 0, marginBottom: i === lastIndex ? 0 : gap }}
          >
            <CardForSlot slot={slot} locked={locked} onPick={onPick} />
            {/* Conector de SALIDA hacia la ronda siguiente (salvo la última columna del árbol). */}
            {!isLast && (
              <>
                {/* tramo horizontal desde el borde derecho de la card hasta el codo */}
                <span className="absolute right-0 top-1/2 -mt-px h-0.5 bg-violet-light/50" style={{ width: CONN }} />
                {/* codo vertical: solo lo dibuja la card SUPERIOR del par; baja un pitch hasta unirse
                    con la inferior, pasando por el centro del partido destino */}
                {i % 2 === 0 && (
                  <span className="absolute top-1/2 -mt-px w-0.5 bg-violet-light/50" style={{ right: -CONN, height: pitch }} />
                )}
              </>
            )}
            {/* Conector de ENTRADA desde la ronda anterior (salvo la primera columna). */}
            {round > 0 && (
              <span className="absolute top-1/2 -mt-px h-0.5 bg-violet-light/50" style={{ left: -CONN, width: CONN }} />
            )}
          </div>
        ))}
      </SlotBox>
    </section>
  )
}

function SlotBox({ children }: { children: ReactNode }) {
  // overflow visible para que los conectores absolutos no se recorten.
  return <div className="flex flex-col">{children}</div>
}

// Elige la card según el estado del cupo: definido y jugable → BracketCard; resto → UndefinedCard.
function CardForSlot({ slot, locked, onPick }: { slot: KoSlot; locked: boolean; onPick: (m: KoMatch) => void }) {
  return slot.match && isDetermined(slot.match) ? (
    <BracketCard m={slot.match} locked={locked} onPick={onPick} />
  ) : (
    <UndefinedCard slot={slot} />
  )
}

// Acento tricolor permanente: franja fina al borde izquierdo de la card de Colombia, para
// distinguir "la nuestra" del resto del cuadro. ('COL' es el código FIFA, estable.)
const COLOMBIA_CODE = 'COL'

function ColombiaStripe() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
      style={{ background: 'linear-gradient(#FCD116 0 40%, #00318A 40% 70%, #CE1126 70% 100%)' }}
    />
  )
}

function Side({ team, score, win }: { team: KoTeam; score: number | null; win: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 ${win ? 'bg-tint' : ''}`}>
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
  const isCol = home.code === COLOMBIA_CODE || away.code === COLOMBIA_CODE
  return (
    <button
      type="button"
      onClick={() => onPick(m)}
      aria-label={`${home.name} vs ${away.name}`}
      className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface text-left shadow-card active:scale-[0.98]"
    >
      {isCol && <ColombiaStripe />}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface-2 px-2 py-0.5">
        <Clock size={9} weight="bold" className="shrink-0 text-muted" />
        <span className="truncate font-mono text-[9px] font-medium text-ink-soft">{formatKoKickoffShort(m.scheduledAt)}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <Side team={home} score={mp?.scoreHome ?? null} win={advId === home.id} />
        <div className="h-px bg-border" />
        <Side team={away} score={mp?.scoreAway ?? null} win={advId === away.id} />
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-border bg-surface-2 px-2 py-0.5">
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

// Cruce aún sin definir oficialmente. Si la ronda previa ya dio un ganador, este "sube" a su cupo
// (proyección) y se muestra con bandera; el rótulo inferior refleja cuánto falta para armar la llave.
function UndefinedCard({ slot }: { slot: KoSlot }) {
  const homeLabel = slot.match ? sideLabel(slot.match, 'home') : 'Por definir'
  const awayLabel = slot.match ? sideLabel(slot.match, 'away') : 'Por definir'
  const both = slot.projHome && slot.projAway
  const some = slot.projHome || slot.projAway
  const status = both ? 'Clasificados' : some ? 'Falta rival' : 'Por definir'
  const isCol = slot.projHome?.code === COLOMBIA_CODE || slot.projAway?.code === COLOMBIA_CODE
  return (
    <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-2/60 px-2 py-1.5">
      {isCol && <ColombiaStripe />}
      <ProjSide team={slot.projHome} label={homeLabel} />
      <div className="my-1 h-px bg-border" />
      <ProjSide team={slot.projAway} label={awayLabel} />
      <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-muted">{status}</p>
    </div>
  )
}

// Un lado de un cruce sin definir: equipo proyectado (bandera + código + check) o el rótulo en gris.
function ProjSide({ team, label }: { team: KoTeam | null; label: string }) {
  if (!team) return <p className="truncate text-[11px] font-medium text-muted">{label}</p>
  return (
    <div className="flex items-center gap-1.5">
      <Flag code={team.code} flag={team.flag} className="size-4" />
      <span className="flex-1 truncate text-[11px] font-bold text-ink">{team.code}</span>
      <Check size={11} weight="bold" className="shrink-0 text-success" />
    </div>
  )
}
