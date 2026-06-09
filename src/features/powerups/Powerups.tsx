import { useState, type ReactNode } from 'react'
import { TrendUp, TrendDown } from '@phosphor-icons/react'
import type { Team } from '../../types/api'
import { useGroups } from '../groups/hooks'
import { usePowerups, useSavePowerups, useFriendsPowerups } from './hooks'
import { isApiError } from '../../lib/errors'
import { Button } from '../../ui/Button'
import { Flag } from '../../ui/Flag'
import { Confetti } from '../../ui/Confetti'
import { WizardFooter } from '../onboarding/WizardFooter'
import { TeamPickerSheet } from './TeamPickerSheet'

export function Powerups({ onComplete }: { onComplete?: () => void }) {
  const groups = useGroups()
  const mine = usePowerups()
  const friends = useFriendsPowerups()
  const wizard = !!onComplete
  const locked = friends.data?.available === true
  const hasPowerups = !!(mine.data?.darkHorse || mine.data?.disappointment)
  const save = useSavePowerups(hasPowerups ? 'update' : 'create')

  const [darkHorse, setDarkHorse] = useState<string | null>(null)
  const [disappointment, setDisappointment] = useState<string | null>(null)
  const [sheet, setSheet] = useState<null | 'dh' | 'dis'>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [done, setDone] = useState(false)

  if (groups.isLoading || mine.isLoading) return <PowerupsSkeleton wizard={wizard} />

  const list = groups.data?.data ?? []
  const teams = list.flatMap((g) => g.teams)
  const notTop8 = teams.filter((t) => !t.isTop8)
  const top8 = teams.filter((t) => t.isTop8)
  const groupOf: Record<string, string> = {}
  for (const g of list) for (const t of g.teams) groupOf[t.id] = g.label

  const dh = darkHorse ?? mine.data?.darkHorse?.teamId ?? ''
  const dis = disappointment ?? mine.data?.disappointment?.teamId ?? ''
  const dhTeam = teams.find((t) => t.id === dh) ?? null
  const disTeam = teams.find((t) => t.id === dis) ?? null
  const ready = !!dh && !!dis

  function onSave() {
    setError('')
    setSaved(false)
    save.mutate(
      { darkHorseTeamId: dh, disappointmentTeamId: dis },
      {
        onSuccess: () => {
          if (wizard) setDone(true)
          else setSaved(true)
        },
        onError: (e) => setError(isApiError(e) ? e.message : 'No se pudo guardar'),
      },
    )
  }

  if (done) return <PowerupsDone onHome={() => onComplete!()} />

  const cta = (
    <div>
      <Button fullWidth loading={save.isPending} disabled={!ready || locked} onClick={onSave}>
        {wizard ? 'Guardar mis pálpitos' : 'Guardar'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-2 text-center text-sm text-success">
          Guardado
        </p>
      )}
    </div>
  )

  return (
    <>
      {!wizard && (
        <header className="mb-4">
          <h1 className="font-display text-2xl font-extrabold text-ink">Tus pálpitos</h1>
          <p className="mt-1 text-ink-soft">Dos corazonadas que mueven tu puntaje.</p>
        </header>
      )}

      <PalpitosIntro />

      <div className="flex flex-col gap-3">
        <PowerupCard
          tone="up"
          icon={<TrendUp size={22} weight="bold" />}
          title="La revelación"
          desc="Un equipo de los que casi nadie tiene fe. Si te sorprende y avanza, ganas puntos: cuanto más lejos llegue, más sumas."
          cue="Hazle fuerza para que llegue lejos"
          team={dhTeam}
          groupLabel={dhTeam ? groupOf[dhTeam.id] : ''}
          hint="fuera de los favoritos"
          disabled={locked}
          onPick={() => setSheet('dh')}
        />
        <PowerupCard
          tone="down"
          icon={<TrendDown size={22} weight="bold" />}
          title="La decepción"
          desc="Uno de los grandes favoritos que crees que va a quedar mal. Cada ronda que avanza te cuesta puntos. Lo ideal: que caiga pronto y no te quite nada."
          cue="Hazle fuerza para que caiga pronto"
          team={disTeam}
          groupLabel={disTeam ? groupOf[disTeam.id] : ''}
          hint="uno de los favoritos"
          disabled={locked}
          onPick={() => setSheet('dis')}
        />
      </div>

      {locked && (
        <p className="mt-3 text-center text-sm font-medium text-lock">
          Las predicciones están cerradas. Solo lectura.
        </p>
      )}

      {wizard ? <WizardFooter>{cta}</WizardFooter> : <div className="mt-6">{cta}</div>}

      <TeamPickerSheet
        open={sheet === 'dh'}
        onClose={() => setSheet(null)}
        title="La revelación"
        subtitle="Equipos por fuera de los 8 favoritos · elige 1"
        teams={notTop8}
        groupOf={groupOf}
        selectedId={dh}
        onPick={(id) => {
          setDarkHorse(id)
          setSheet(null)
        }}
      />
      <TeamPickerSheet
        open={sheet === 'dis'}
        onClose={() => setSheet(null)}
        title="La decepción"
        subtitle="Los 8 grandes favoritos · elige 1"
        teams={top8}
        groupOf={groupOf}
        selectedId={dis}
        onPick={(id) => {
          setDisappointment(id)
          setSheet(null)
        }}
      />
    </>
  )
}

function PalpitosIntro() {
  return (
    <div className="mb-4 rounded-card border border-border bg-surface-2 p-4">
      <p className="text-sm font-bold text-ink">Elige 2 equipos con el instinto</p>
      <ul className="mt-2.5 space-y-2">
        <li className="flex items-start gap-2.5 text-sm text-ink-soft">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/10 text-success">
            <TrendUp size={13} weight="bold" />
          </span>
          <span>
            Uno que crees que va a <b className="font-bold text-ink">sorprender</b>. Te suma puntos.
          </span>
        </li>
        <li className="flex items-start gap-2.5 text-sm text-ink-soft">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <TrendDown size={13} weight="bold" />
          </span>
          <span>
            Uno que crees que va a <b className="font-bold text-ink">fallar</b>. Te resta puntos.
          </span>
        </li>
      </ul>
    </div>
  )
}

function PowerupCard({
  tone,
  icon,
  title,
  desc,
  cue,
  team,
  groupLabel,
  hint,
  disabled,
  onPick,
}: {
  tone: 'up' | 'down'
  icon: ReactNode
  title: string
  desc: string
  cue: string
  team: Team | null
  groupLabel: string
  hint: string
  disabled: boolean
  onPick: () => void
}) {
  const up = tone === 'up'
  const accent = up ? 'text-success' : 'text-danger'
  const chip = up ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="rounded-card border border-border bg-surface p-4 text-left shadow-card transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-60"
    >
      <span className="flex items-center gap-2.5">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${chip}`}>{icon}</span>
        <span className="flex-1 font-display text-lg font-extrabold text-ink">{title}</span>
        <span className={`rounded-full px-2.5 py-1 font-mono text-xs font-bold ${chip}`}>
          {up ? '+ Suma' : '− Resta'}
        </span>
      </span>
      <span className="mt-2 block text-sm text-ink-soft">{desc}</span>
      <span className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${accent}`}>
        {up ? <TrendUp size={15} weight="bold" /> : <TrendDown size={15} weight="bold" />}
        {cue}
      </span>
      {team ? (
        <span className="mt-3 flex items-center gap-3 rounded-control border border-border bg-surface-2 p-2.5">
          <Flag code={team.code} flag={team.flag} />
          <span className="flex-1">
            <span className="block font-display text-sm font-bold text-ink">{team.name}</span>
            <span className="block text-xs text-ink-soft">
              Grupo {groupLabel} · {hint}
            </span>
          </span>
          <span className="font-display text-sm font-bold text-violet">Cambiar</span>
        </span>
      ) : (
        <span className="mt-3 block rounded-control border border-dashed border-border p-3 text-center text-sm font-semibold text-muted">
          Toca para elegir equipo
        </span>
      )}
    </button>
  )
}

function PowerupsDone({ onHome }: { onHome: () => void }) {
  return (
    <div className="relative grid place-items-center py-16 text-center">
      <Confetti />
      <h2 className="font-display text-2xl font-black text-ink">¡Tu polla está lista!</h2>
      <p className="mt-2 max-w-[34ch] text-ink-soft">
        Ya hiciste todas tus predicciones. Puedes editarlas hasta el cierre.
      </p>
      <Button className="mt-6" onClick={onHome}>
        Ir al inicio
      </Button>
    </div>
  )
}

function PowerupsSkeleton({ wizard }: { wizard: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${wizard ? '' : 'mt-2'}`}>
      <div className="h-40 animate-pulse rounded-card bg-surface-2" aria-busy />
      <div className="h-40 animate-pulse rounded-card bg-surface-2" aria-busy />
    </div>
  )
}
