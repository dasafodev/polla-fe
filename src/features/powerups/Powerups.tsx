import { useState, type ReactNode } from 'react'
import { Horse, TrendDown } from '@phosphor-icons/react'
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
        {wizard ? 'Activar powerups' : 'Guardar'}
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
        <header className="mb-5">
          <h1 className="font-display text-2xl font-extrabold text-ink">Tus powerups</h1>
          <p className="mt-1 text-ink-soft">Activa tu caballo oscuro y tu decepción del torneo.</p>
        </header>
      )}

      <div className="flex flex-col gap-3">
        <PowerupCard
          tone="dh"
          icon={<Horse size={22} weight="bold" />}
          title="Caballo oscuro"
          desc="Un equipo fuera del top 8. Suma puntos por cada ronda que avanza."
          team={dhTeam}
          groupLabel={dhTeam ? groupOf[dhTeam.id] : ''}
          hint="fuera del top 8"
          disabled={locked}
          onPick={() => setSheet('dh')}
        />
        <PowerupCard
          tone="dis"
          icon={<TrendDown size={22} weight="bold" />}
          title="La decepción"
          desc="Un equipo del top 8. Suma puntos por cada ronda en que cae antes."
          team={disTeam}
          groupLabel={disTeam ? groupOf[disTeam.id] : ''}
          hint="del top 8"
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
        title="Caballo oscuro"
        subtitle="Equipos fuera del top 8 · elige 1"
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
        subtitle="Equipos del top 8 · elige 1"
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

function PowerupCard({
  tone,
  icon,
  title,
  desc,
  team,
  groupLabel,
  hint,
  disabled,
  onPick,
}: {
  tone: 'dh' | 'dis'
  icon: ReactNode
  title: string
  desc: string
  team: Team | null
  groupLabel: string
  hint: string
  disabled: boolean
  onPick: () => void
}) {
  const iconBg = tone === 'dh' ? 'bg-tint text-violet' : 'bg-[#fdeede] text-lock'
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="rounded-card border border-border bg-surface p-4 text-left shadow-card transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-60"
    >
      <span className={`mb-2.5 grid size-10 place-items-center rounded-xl ${iconBg}`}>{icon}</span>
      <span className="block font-display text-lg font-extrabold text-ink">{title}</span>
      <span className="mt-0.5 block text-sm text-ink-soft">{desc}</span>
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
