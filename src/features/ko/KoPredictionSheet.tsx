import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Minus, Plus, Check, X, LockSimple, Trophy, Users } from '@phosphor-icons/react'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'
import { Flag } from '../../ui/Flag'
import { useKoMatch, useSaveKoPrediction, useFriendsKo } from './hooks'
import { koSaveErrorText } from './koErrors'
import { displayName } from '../../lib/names'
import type { KoMatch, KoTeam, KoResult, SaveKoPredictionBody } from '../../types/api'

export function KoPredictionSheet({
  match,
  roundName,
  tripleRemaining,
  onClose,
}: {
  match: KoMatch | null
  roundName?: string
  tripleRemaining: number
  onClose: () => void
}) {
  return (
    <Sheet open={!!match} onClose={onClose} title={roundName ?? 'Eliminatoria'} ariaLabel="Pronóstico de eliminatoria">
      {/* key por id: remonta el form (y reinicia el estado desde myPrediction) al cambiar de partido. */}
      {match && <SheetBody key={match.id} initial={match} tripleRemaining={tripleRemaining} onClose={onClose} />}
    </Sheet>
  )
}

function SheetBody({ initial, tripleRemaining, onClose }: { initial: KoMatch; tripleRemaining: number; onClose: () => void }) {
  // useKoMatch da la copia fresca (con su propio isFetching): tras un POST, invalidar ko refetchea y
  // el gating evita el 409 del segundo guardado antes de que el modo pase a 'update'.
  const q = useKoMatch(initial.id)
  const friends = useFriendsKo(initial.id)
  const m = q.data ?? initial
  const home = m.homeTeam
  const away = m.awayTeam
  if (!home || !away) return null

  const editable = !m.locked && m.status !== 'finished'
  return (
    <div className="space-y-4 px-2 pt-1">
      {editable ? (
        <EditForm match={m} home={home} away={away} tripleRemaining={tripleRemaining} isFetching={q.isFetching} onClose={onClose} />
      ) : (
        <ReadOnly match={m} home={home} away={away} />
      )}
      <FriendsBlock
        data={friends.data}
        isLoading={friends.isLoading}
        isError={friends.isError}
        onRetry={() => friends.refetch()}
        home={home}
        away={away}
        result={m.result}
      />
    </div>
  )
}

function TeamLine({ team, children }: { team: KoTeam; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Flag code={team.code} flag={team.flag} className="size-8" />
      <span className="flex-1 truncate font-display font-bold text-ink">{team.name}</span>
      {children}
    </div>
  )
}

function Stepper({ value, onChange, disabled, label }: { value: number; onChange: (n: number) => void; disabled?: boolean; label: string }) {
  const btn = 'grid size-9 place-items-center rounded-full border border-border bg-surface text-ink active:scale-90 disabled:opacity-30'
  return (
    <div className="flex items-center gap-2.5">
      <button type="button" aria-label={`Restar gol a ${label}`} className={btn} disabled={disabled || value <= 0} onClick={() => onChange(Math.max(0, value - 1))}>
        <Minus size={16} weight="bold" />
      </button>
      <span aria-label={`Goles de ${label}`} className="w-6 text-center font-mono text-2xl font-extrabold tabular-nums text-ink">
        {value}
      </span>
      <button type="button" aria-label={`Sumar gol a ${label}`} className={btn} disabled={disabled} onClick={() => onChange(value + 1)}>
        <Plus size={16} weight="bold" />
      </button>
    </div>
  )
}

// Espera tras el último cambio antes de persistir: coalesce los taps rápidos al +/− en un solo guardado.
const AUTOSAVE_DEBOUNCE_MS = 600
const snapshot = (b: SaveKoPredictionBody) => `${b.scoreHome}-${b.scoreAway}-${b.teamAdvancesId}-${b.tripleActive}`

function EditForm({
  match,
  home,
  away,
  tripleRemaining,
  isFetching,
  onClose,
}: {
  match: KoMatch
  home: KoTeam
  away: KoTeam
  tripleRemaining: number
  isFetching: boolean
  onClose: () => void
}) {
  const mp = match.myPrediction
  const [scoreHome, setScoreHome] = useState(mp?.scoreHome ?? 0)
  const [scoreAway, setScoreAway] = useState(mp?.scoreAway ?? 0)
  // En empate el usuario elige; con ganador se deriva del marcador (es obvio quién pasa).
  const [tieWinner, setTieWinner] = useState(mp && mp.scoreHome === mp.scoreAway ? mp.teamAdvancesId : '')
  const [triple, setTriple] = useState(mp?.tripleActive ?? false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const isTie = scoreHome === scoreAway
  const advances = isTie ? tieWinner : scoreHome > scoreAway ? home.id : away.id

  // El BE exige teamAdvancesId siempre: lo seguimos mandando, solo que calculado cuando hay ganador.
  const body: SaveKoPredictionBody = { scoreHome, scoreAway, teamAdvancesId: advances, tripleActive: triple }

  // createdRef evita un segundo 'create' (→ 409) si un autoguardado dispara antes de que el refetch
  // post-create repueble myPrediction: una vez creado el cruce, todo guardado siguiente es 'update'.
  const createdRef = useRef(!!mp)
  const save = useSaveKoPrediction(match.id, mp || createdRef.current ? 'update' : 'create')
  const initialSnap = mp ? snapshot({ scoreHome: mp.scoreHome, scoreAway: mp.scoreAway, teamAdvancesId: mp.teamAdvancesId, tripleActive: mp.tripleActive }) : null
  const lastSaved = useRef<string | null>(initialSnap) // último payload PERSISTIDO (para "no hay nada nuevo, solo cierra")
  const lastAttempt = useRef<string | null>(initialSnap) // último payload INTENTADO: corta el reintento en bucle de un guardado que falla

  // No puede activar un nuevo triple si ya no le quedan usos (sí puede desactivar el que ya tenía).
  const canTriple = triple || tripleRemaining > 0 || !!mp?.tripleActive

  function persist(onDone?: () => void) {
    const snap = snapshot(body)
    lastAttempt.current = snap // marca el intento ANTES de mutar: si falla, el autoguardado no lo repite
    setMessage(null)
    save.mutate(body, {
      onSuccess: () => {
        createdRef.current = true
        lastSaved.current = snap
        setMessage({ ok: true, text: mp ? 'Pronóstico actualizado' : 'Pronóstico guardado' })
        onDone?.()
      },
      onError: (e) => setMessage({ ok: false, text: koSaveErrorText(e) }),
    })
  }

  // Autoguardado: cualquier cambio que deje un pronóstico completo se persiste solo (con debounce).
  // En empate sin elegir quién avanza no hay teamAdvancesId → no se dispara (el BE lo rechazaría).
  const snap = snapshot(body)
  useEffect(() => {
    if (!advances) return
    if (snap === lastAttempt.current) return // ya guardado o ya intentado (y fallido): no reintentar solo
    if (save.isPending || isFetching) return // hay un guardado/refetch en vuelo: reintenta al re-render
    const t = setTimeout(() => persist(), AUTOSAVE_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, advances, isFetching, save.isPending])

  function onSaveAndClose() {
    // Tras el autoguardado normalmente ya está todo persistido: si no hay nada nuevo, solo cierra.
    if (snapshot(body) === lastSaved.current && !save.isPending) return onClose()
    persist(onClose)
  }

  return (
    <>
      <div className="space-y-3 rounded-card border border-border bg-surface-2 p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Tu marcador</p>
        <TeamLine team={home}>
          <Stepper value={scoreHome} onChange={setScoreHome} label={home.name} />
        </TeamLine>
        <TeamLine team={away}>
          <Stepper value={scoreAway} onChange={setScoreAway} label={away.name} />
        </TeamLine>
      </div>

      {isTie && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">¿Quién avanza?</p>
          <div className="grid grid-cols-2 gap-2">
            {[home, away].map((t) => {
              const on = advances === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTieWinner(t.id)}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-control border px-3 py-3 text-left transition ${
                    on ? 'border-violet bg-tint text-violet-strong' : 'border-border bg-surface text-ink-soft'
                  }`}
                >
                  <Flag code={t.code} flag={t.flag} className="size-6" />
                  <span className="flex-1 truncate text-sm font-bold">{t.name}</span>
                  {on && <Check size={16} weight="bold" />}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-muted">En empate, define quién pasa (penales o prórroga).</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => canTriple && setTriple((v) => !v)}
        disabled={!canTriple}
        aria-pressed={triple}
        className={`flex w-full items-center gap-3 rounded-control border px-3 py-3 text-left transition disabled:opacity-50 ${
          triple ? 'border-gold bg-[#f6eed9]' : 'border-border bg-surface'
        }`}
      >
        <span className={`grid size-9 place-items-center rounded-full ${triple ? 'bg-gold text-white' : 'bg-surface-2 text-muted'}`}>
          <Trophy size={18} weight={triple ? 'fill' : 'regular'} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-ink">Triple o nada</span>
          <span className="block text-[11px] text-muted">
            {triple ? 'Activo: x3 si aciertas el marcador exacto, 0 si no.' : `Te quedan ${tripleRemaining} de 3.`}
          </span>
        </span>
        <span className={`size-5 shrink-0 rounded-full border-2 ${triple ? 'border-gold bg-gold' : 'border-border'}`} aria-hidden />
      </button>

      <Button fullWidth onClick={onSaveAndClose} loading={save.isPending} disabled={isFetching || !advances}>
        {mp ? 'Actualizar pronóstico' : 'Guardar pronóstico'}
      </Button>
      {message && (
        <p role="alert" className={`text-center text-sm font-medium ${message.ok ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </>
  )
}

// Chip cualitativo de desglose: verde+Check si se logró, muted+Minus si no. Nunca lleva número por
// chip (el reparto real escala por ronda); el número autoritativo es pe.total, mostrado una sola vez.
function Crit({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[12px] font-bold ${
        ok ? 'bg-[#e6f4ee] text-success' : 'bg-surface text-muted'
      }`}
    >
      {ok ? <Check size={12} weight="bold" /> : <Minus size={12} weight="bold" />}
      {label}
    </span>
  )
}

function ReadOnly({ match, home, away }: { match: KoMatch; home: KoTeam; away: KoTeam }) {
  const mp = match.myPrediction
  const res = match.result
  const pe = mp?.pointsEarned
  const finished = match.status === 'finished'
  const triple = !!mp?.tripleActive
  const tripleApplied = (pe?.mult_triple ?? 0) > 0 // ×3 efectivo (solo si pegó el marcador exacto)

  const realWinTeam = res ? (res.winnerTeamId === home.id ? home : res.winnerTeamId === away.id ? away : null) : null
  const myAdvTeam = mp ? (mp.teamAdvancesId === home.id ? home : mp.teamAdvancesId === away.id ? away : null) : null
  const advancesHit = !!(mp && res) && mp.teamAdvancesId === res.winnerTeamId
  const scored = (pe?.total ?? 0) > 0
  const tripleBusted = triple && !!pe && pe.total === 0 // activó triple pero el cruce quedó en 0

  const cell = 'grid h-10 w-11 place-items-center rounded-control font-mono text-lg font-bold tabular-nums'

  return (
    <div className="space-y-3">
      {/* Header de estado + sello de triple */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fbefd9] px-3 py-1 text-[13px] font-medium text-lock">
          <LockSimple size={13} weight="bold" /> {finished ? 'Finalizado' : 'Cerrado'}
        </span>
        {triple && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f6eed9] px-2.5 py-1 text-[12px] font-bold text-gold">
            <Trophy size={12} weight="fill" /> Triple o nada
          </span>
        )}
      </div>

      {!mp ? (
        // No pronosticó: mostramos igual el resultado real, sobrio.
        <div className="rounded-card border border-border bg-surface-2 p-4">
          <p className="text-sm font-medium text-ink-soft">No pronosticaste este partido.</p>
          {res && realWinTeam && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
              <Trophy size={14} weight="fill" className="text-violet" />
              Avanzó <span className="font-bold text-ink">{realWinTeam.name}</span>
              <span className="font-mono tabular-nums text-ink-soft">
                ({res.scoreHome}–{res.scoreAway})
              </span>
            </p>
          )}
        </div>
      ) : res ? (
        // Hay pronóstico y resultado → comparación TÚ | REAL.
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-center gap-3 border-b border-l-[3px] border-transparent border-b-border bg-surface-2 px-4 py-2">
            <span className="flex-1 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Marcador</span>
            <span className="w-11 text-center font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Tú</span>
            <span className="w-11 text-center font-mono text-[11px] font-bold uppercase tracking-wide text-violet-strong">Real</span>
          </div>

          {[home, away].map((t) => {
            const isWin = realWinTeam?.id === t.id
            const tu = t.id === home.id ? mp.scoreHome : mp.scoreAway
            const real = t.id === home.id ? res.scoreHome : res.scoreAway
            return (
              <div
                key={t.id}
                className={`flex items-center gap-3 border-l-[3px] px-4 py-3 ${isWin ? 'border-violet bg-surface-2' : 'border-transparent'}`}
              >
                <Flag code={t.code} flag={t.flag} className="size-7" />
                <span className={`min-w-0 flex-1 truncate font-display ${isWin ? 'font-extrabold text-ink' : 'font-semibold text-ink-soft'}`}>
                  {t.name}
                </span>
                <span className={`${cell} border border-border bg-surface text-ink-soft`}>{tu}</span>
                <span className={`${cell} border ${isWin ? 'border-violet bg-violet text-white' : 'border-border bg-surface-2 text-ink'}`}>{real}</span>
              </div>
            )
          })}

          {/* Veredicto de avance: lidera con la verdad (quién pasó); a la derecha tu acierto/fallo. */}
          <div className="flex items-center gap-2 border-l-[3px] border-t border-transparent border-t-border bg-surface-2 px-4 py-2.5">
            <Trophy size={15} weight="fill" className="shrink-0 text-violet" />
            <span className="min-w-0 truncate text-[13px]">
              <span className="text-muted">Avanza </span>
              <span className="font-bold text-ink">{realWinTeam?.name ?? 'Por definir'}</span>
            </span>
            {advancesHit ? (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e6f4ee] px-2 py-0.5 font-mono text-[12px] font-bold text-success">
                <Check size={12} weight="bold" /> Acertaste
              </span>
            ) : (
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 font-mono text-[12px] font-bold text-danger">
                <X size={12} weight="bold" /> Pusiste {myAdvTeam?.code ?? '—'}
              </span>
            )}
          </div>
        </div>
      ) : (
        // Cerrado sin resultado aún → solo tu marcador.
        <div className="rounded-card border border-border bg-surface-2 p-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Tu pronóstico</p>
          <div className="mt-2 space-y-2">
            {[home, away].map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <Flag code={t.code} flag={t.flag} className="size-7" />
                <span className="min-w-0 flex-1 truncate font-display font-semibold text-ink">{t.name}</span>
                <span className="font-mono text-xl font-extrabold tabular-nums text-ink">
                  {t.id === home.id ? mp.scoreHome : mp.scoreAway}
                </span>
              </div>
            ))}
          </div>
          {myAdvTeam && (
            <p className="mt-3 text-[13px] text-ink-soft">
              Avanza <span className="font-bold text-ink">{myAdvTeam.name}</span>
            </p>
          )}
          <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Esperando resultado</p>
        </div>
      )}

      {/* Banda de puntos: total grande + chips cualitativos (solo con cálculo). */}
      {mp &&
        res &&
        (pe ? (
          <div className={`rounded-card border p-4 ${scored ? 'border-[#d8efe3] bg-[#e6f4ee]' : 'border-border bg-surface-2'}`}>
            <div className="flex items-center gap-4">
              <div className="flex shrink-0 flex-col items-center px-1">
                <span className={`font-display text-[40px] font-extrabold leading-none tabular-nums ${scored ? 'text-success' : 'text-muted'}`}>
                  {pe.total}
                </span>
                <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wide text-muted">puntos</span>
              </div>
              <div className="flex flex-1 flex-wrap content-center gap-1.5">
                <Crit ok={pe.pts_ko_advances > 0} label="Quién avanza" />
                <Crit ok={pe.pts_ko_exact_score > 0} label="Marcador exacto" />
                {triple && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[12px] font-bold text-gold ${
                      tripleApplied ? 'bg-[#f6eed9]' : 'bg-surface'
                    }`}
                  >
                    <Trophy size={12} weight="fill" /> {tripleApplied ? '×3' : 'Triple sin efecto'}
                  </span>
                )}
              </div>
            </div>
            {tripleBusted && (
              <p className="mt-3 text-[12px] text-muted">Con Triple o nada, sin marcador exacto el cruce suma 0.</p>
            )}
          </div>
        ) : (
          <p className="rounded-card border border-border bg-surface-2 px-4 py-3 text-center text-[13px] text-ink-soft">
            Puntaje pendiente de cálculo.
          </p>
        ))}
    </div>
  )
}

function FriendsBlock({
  data,
  isLoading,
  isError,
  onRetry,
  home,
  away,
  result,
}: {
  data: ReturnType<typeof useFriendsKo>['data']
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  home: KoTeam
  away: KoTeam
  result: KoResult | null
}) {
  const rows = data?.available ? data.data ?? [] : []

  // Aciertos CALCULADOS comparando cada pronóstico contra el resultado real. El contrato NO trae
  // puntos por integrante: nunca mostramos "+N pts" por persona. 'avanza' y 'exacto' son
  // independientes (cubre empate→penales). Sin resultado (partido en juego), todo queda neutral.
  const items = rows.map((f) => {
    const p = f.prediction
    const advTeam = p ? (p.teamAdvancesId === home.id ? home : p.teamAdvancesId === away.id ? away : null) : null
    const hitAdvance = !!(p && result && p.teamAdvancesId === result.winnerTeamId)
    const hitExact = !!(p && result && p.scoreHome === result.scoreHome && p.scoreAway === result.scoreAway)
    return { f, p, advTeam, hitAdvance, hitExact, correct: hitAdvance || hitExact, name: displayName(f.participant.name) }
  })

  // Aciertos primero (exacto > avanza > falló > sin pronóstico). sort estable conserva el orden del server.
  const rank = (d: (typeof items)[number]) => (!d.p ? 3 : d.hitExact ? 0 : d.hitAdvance ? 1 : 2)
  items.sort((a, b) => rank(a) - rank(b))

  const withPred = items.filter((d) => d.p).length
  const nAdvance = items.filter((d) => d.hitAdvance).length
  const nExact = items.filter((d) => d.hitExact).length

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
          <Users size={13} weight="bold" /> Pronósticos de la polla
        </p>
        {data?.available && withPred > 0 && <span className="font-mono text-[11px] tabular-nums text-muted">{withPred}</span>}
      </div>

      {/* Resumen honesto: solo con partido terminado. Cuenta aciertos calculados, nunca puntos. */}
      {result && withPred > 0 && (
        <p className="mt-1 text-[12px] text-ink-soft">
          {nAdvance} de {withPred} {nAdvance === 1 ? 'acertó' : 'acertaron'} quién avanza
          {nExact > 0 ? ` · ${nExact} ${nExact === 1 ? 'marcador exacto' : 'marcadores exactos'}` : ''}
        </p>
      )}

      {isLoading ? (
        <ul className="-mx-4 mt-3 divide-y divide-border border-y border-border">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="size-9 shrink-0 animate-pulse rounded-full bg-bg" />
              <span className="h-3 w-28 animate-pulse rounded-full bg-bg" />
              <span className="ml-auto h-3 w-10 animate-pulse rounded-full bg-bg" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        // Un fallo de red NO debe degradarse a "aún no disponible": error real + reintento.
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">No se pudieron cargar los pronósticos.</p>
          <button type="button" onClick={onRetry} className="shrink-0 text-sm font-bold text-violet active:scale-[0.98]">
            Reintentar
          </button>
        </div>
      ) : !data?.available ? (
        <p className="mt-2 text-sm text-ink-soft">Se revelan cuando arranca el partido.</p>
      ) : items.length > 0 ? (
        <ul className="-mx-4 mt-3 divide-y divide-border border-y border-border">
          {items.map(({ f, p, advTeam, hitAdvance, hitExact, correct, name }) => {
            const tint = hitExact ? 'bg-[#d8efe3]' : hitAdvance ? 'bg-[#eaf6f0]' : ''
            // El ×3 solo "paga" con marcador exacto Y avance correcto (el scoring exige ambos: en un
            // empate por penales se puede clavar el marcador y aun así avanzar el otro → bono 0).
            const triplePaid = !result || (hitExact && hitAdvance)
            return (
              <li key={f.participant.id} className={`flex items-center gap-3 px-4 py-2.5 ${tint}`}>
                <span className="relative shrink-0">
                  <span
                    className={`grid size-9 place-items-center rounded-full font-display text-sm font-bold ${
                      p ? 'bg-tint text-violet-strong' : 'bg-surface-2 text-muted'
                    }`}
                    aria-hidden
                  >
                    {name.charAt(0)}
                  </span>
                  {correct && (
                    <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border-2 border-surface bg-success text-white" aria-hidden>
                      <Check size={9} weight="bold" />
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${p ? 'text-ink' : 'text-muted'}`}>{name}</span>
                  {/* El acierto no depende solo del color/anillo: lo anunciamos a lectores. */}
                  {correct && (
                    <span className="sr-only">
                      {hitExact ? 'Marcador exacto. ' : ''}
                      {hitAdvance ? 'Acertó quién avanza.' : ''}
                    </span>
                  )}
                </span>

                {p ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    {hitExact && (
                      <span className="rounded-full bg-[#e6f4ee] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-success">
                        Exacto
                      </span>
                    )}
                    {p.tripleActive && (
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          triplePaid ? 'bg-[#f6eed9] text-gold' : 'bg-surface-2 text-muted'
                        }`}
                      >
                        <Trophy size={10} weight="fill" />×3
                      </span>
                    )}
                    {advTeam && (
                      <>
                        {/* La bandera es aria-hidden: anunciamos a lectores a quién dijo que avanza. */}
                        <span className="sr-only">Avanza {advTeam.name}.</span>
                        <Flag code={advTeam.code} flag={advTeam.flag} className={`size-5 ${hitAdvance ? 'ring-2 ring-success' : ''}`} />
                      </>
                    )}
                    <span className="w-11 text-right font-mono text-base font-extrabold tabular-nums text-ink">
                      {p.scoreHome}–{p.scoreAway}
                    </span>
                  </span>
                ) : (
                  <span className="shrink-0 text-[12px] text-muted">Sin pronóstico</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">Nadie más ha pronosticado.</p>
      )}
    </div>
  )
}
