import { useState, type ReactNode } from 'react'
import { Minus, Plus, Check, LockSimple, Trophy, Users } from '@phosphor-icons/react'
import { Sheet } from '../../ui/Sheet'
import { Button } from '../../ui/Button'
import { Flag } from '../../ui/Flag'
import { useKoMatch, useSaveKoPrediction, useFriendsKo } from './hooks'
import { isApiError } from '../../lib/errors'
import { displayName } from '../../lib/names'
import { signed } from '../predicciones/format'
import type { KoMatch, KoTeam } from '../../types/api'

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
      {match && <SheetBody key={match.id} initial={match} tripleRemaining={tripleRemaining} />}
    </Sheet>
  )
}

function SheetBody({ initial, tripleRemaining }: { initial: KoMatch; tripleRemaining: number }) {
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
        <EditForm match={m} home={home} away={away} tripleRemaining={tripleRemaining} isFetching={q.isFetching} />
      ) : (
        <ReadOnly match={m} home={home} away={away} />
      )}
      <FriendsBlock data={friends.data} isLoading={friends.isLoading} home={home} away={away} />
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

function EditForm({
  match,
  home,
  away,
  tripleRemaining,
  isFetching,
}: {
  match: KoMatch
  home: KoTeam
  away: KoTeam
  tripleRemaining: number
  isFetching: boolean
}) {
  const mp = match.myPrediction
  const [scoreHome, setScoreHome] = useState(mp?.scoreHome ?? 0)
  const [scoreAway, setScoreAway] = useState(mp?.scoreAway ?? 0)
  const [advances, setAdvances] = useState(mp?.teamAdvancesId ?? '')
  const [triple, setTriple] = useState(mp?.tripleActive ?? false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const save = useSaveKoPrediction(match.id, mp ? 'update' : 'create')

  // No puede activar un nuevo triple si ya no le quedan usos (sí puede desactivar el que ya tenía).
  const canTriple = triple || tripleRemaining > 0 || !!mp?.tripleActive

  function onSave() {
    setMessage(null)
    save.mutate(
      { scoreHome, scoreAway, teamAdvancesId: advances, tripleActive: triple },
      {
        onSuccess: () => setMessage({ ok: true, text: mp ? 'Pronóstico actualizado' : 'Pronóstico guardado' }),
        onError: (e) => setMessage({ ok: false, text: isApiError(e) ? e.message : 'No se pudo guardar' }),
      },
    )
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

      <div className="space-y-2">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">¿Quién avanza?</p>
        <div className="grid grid-cols-2 gap-2">
          {[home, away].map((t) => {
            const on = advances === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAdvances(t.id)}
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

      <Button fullWidth onClick={onSave} loading={save.isPending} disabled={isFetching || !advances}>
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

function ReadOnly({ match, home, away }: { match: KoMatch; home: KoTeam; away: KoTeam }) {
  const mp = match.myPrediction
  const res = match.result
  const pe = mp?.pointsEarned
  const advancesTeam = mp?.teamAdvancesId === home.id ? home : mp?.teamAdvancesId === away.id ? away : null
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fbefd9] px-3 py-1 text-[13px] font-medium text-lock">
          <LockSimple size={13} weight="bold" /> {match.status === 'finished' ? 'Finalizado' : 'Cerrado'}
        </span>
      </div>

      <div className="rounded-card border border-border bg-surface-2 p-4">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Tu pronóstico</p>
        {mp ? (
          <>
            <div className="mt-2 space-y-2">
              <TeamLine team={home}>
                <span className="font-mono text-xl font-extrabold tabular-nums text-ink">{mp.scoreHome}</span>
              </TeamLine>
              <TeamLine team={away}>
                <span className="font-mono text-xl font-extrabold tabular-nums text-ink">{mp.scoreAway}</span>
              </TeamLine>
            </div>
            {advancesTeam && <p className="mt-2 text-sm text-ink-soft">Avanza <span className="font-bold text-ink">{advancesTeam.name}</span>{mp.tripleActive ? ' · Triple o nada' : ''}</p>}
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">No pronosticaste este partido.</p>
        )}
      </div>

      {res && (
        <div className="rounded-card border border-border bg-surface p-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">Resultado real</p>
          <p className="mt-1 font-display text-lg font-extrabold text-ink">
            {home.name} {res.scoreHome} – {res.scoreAway} {away.name}
          </p>
          {pe && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-bold ${pe.total > 0 ? 'bg-[#e6f4ee] text-success' : 'bg-surface-2 text-muted'}`}>
                {signed(pe.total)} pts
              </span>
              {pe.pts_ko_advances > 0 && <span className="rounded-full bg-tint px-2.5 py-0.5 font-mono text-xs font-medium text-violet-strong">Acertó quién avanza</span>}
              {pe.pts_ko_exact_score > 0 && <span className="rounded-full bg-[#e6f4ee] px-2.5 py-0.5 font-mono text-xs font-medium text-success">Marcador exacto</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FriendsBlock({
  data,
  isLoading,
  home,
  away,
}: {
  data: ReturnType<typeof useFriendsKo>['data']
  isLoading: boolean
  home: KoTeam
  away: KoTeam
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-muted">
        <Users size={13} weight="bold" /> Pronósticos de la polla
      </p>
      {isLoading ? (
        <p className="mt-2 text-sm text-muted">Cargando…</p>
      ) : !data?.available ? (
        <p className="mt-2 text-sm text-ink-soft">Se revelan cuando arranca el partido.</p>
      ) : data.data && data.data.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {data.data.map((f) => {
            const adv = f.prediction?.teamAdvancesId === home.id ? home.code : f.prediction?.teamAdvancesId === away.id ? away.code : null
            return (
              <li key={f.participant.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{displayName(f.participant.name)}</span>
                <span className="font-mono text-ink">
                  {f.prediction ? (
                    <>
                      {f.prediction.scoreHome}–{f.prediction.scoreAway}
                      {adv ? <span className="ml-1 text-muted">→ {adv}</span> : null}
                      {f.prediction.tripleActive ? <span className="ml-1 text-gold">×3</span> : null}
                    </>
                  ) : (
                    <span className="text-muted">sin pronóstico</span>
                  )}
                </span>
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
