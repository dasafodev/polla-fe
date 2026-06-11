import { useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { useThirds, useSaveThirds, useFriendsGroups } from './hooks'
import { predictionsLocked } from '../../lib/predictionsLock'
import { isApiError } from '../../lib/errors'
import { Button } from '../../ui/Button'
import { Flag } from '../../ui/Flag'
import { BackButton, useGoBack } from '../../ui/BackButton'
import { WizardFooter } from '../onboarding/WizardFooter'

const TARGET = 8

export function Thirds({ onComplete }: { onComplete?: () => void }) {
  const thirds = useThirds()
  const friends = useFriendsGroups()
  const save = useSaveThirds()
  const goBack = useGoBack()
  const wizard = !!onComplete
  const locked = predictionsLocked(friends.data?.available)

  // null = sin ediciones (usa la selección del server); [] = el usuario deseleccionó todo (válido).
  const [picked, setPicked] = useState<string[] | null>(null)
  const [error, setError] = useState('')

  if (thirds.isLoading) return <ThirdsSkeleton wizard={wizard} />
  if (thirds.isError) return <ThirdsError onRetry={() => thirds.refetch()} />

  const data = thirds.data?.data ?? []
  const serverSelected = data.filter((c) => c.selected).map((c) => c.teamId)
  const selected = picked ?? serverSelected
  const selectedSet = new Set(selected)
  const count = selected.length
  const full = count === TARGET

  if (data.length < TARGET) return <ThirdsEmpty wizard={wizard} />

  function toggle(teamId: string) {
    setError('')
    setPicked((prev) => {
      const base = prev ?? serverSelected
      if (base.includes(teamId)) return base.filter((x) => x !== teamId)
      if (base.length >= TARGET) return base // tope de 8
      return [...base, teamId]
    })
  }

  function onSave() {
    setError('')
    save.mutate(
      { teamIds: selected },
      {
        onSuccess: () => {
          if (wizard) onComplete!()
          else goBack()
        },
        onError: (e) => setError(isApiError(e) ? e.message : 'No se pudo guardar'),
      },
    )
  }

  const cta = (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <span aria-live="polite" className="font-mono text-sm font-bold text-ink">
          {count} de {TARGET} elegidos
        </span>
        <span className="flex gap-1.5" aria-hidden>
          {Array.from({ length: TARGET }).map((_, i) => (
            <i key={i} className={`size-2 rounded-full ${i < count ? 'bg-violet' : 'bg-border'}`} />
          ))}
        </span>
      </div>
      <Button fullWidth loading={save.isPending} disabled={!full || locked} onClick={onSave}>
        {wizard ? (full ? 'Guardar y continuar' : `Elige ${TARGET - count} más`) : 'Guardar'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )

  return (
    <>
      {!wizard && (
        <>
          <BackButton />
          <header className="mb-5">
            <h1 className="font-display text-2xl font-extrabold text-ink">Los 8 mejores terceros</h1>
            <p className="mt-1 text-ink-soft">De los 12 que dejaste en 3° puesto, elige los 8 que crees que clasifican.</p>
          </header>
        </>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {data.map((c) => {
          const isSel = selectedSet.has(c.teamId)
          return (
            <button
              key={c.teamId}
              type="button"
              aria-pressed={isSel}
              disabled={locked || (!isSel && full)}
              onClick={() => toggle(c.teamId)}
              className={`relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-40 ${
                isSel ? 'border-violet bg-tint' : 'border-border bg-surface'
              }`}
            >
              <span
                className={`absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full border ${
                  isSel ? 'border-violet bg-violet text-white' : 'border-border bg-surface'
                }`}
                aria-hidden
              >
                {isSel && <Check size={13} weight="bold" />}
              </span>
              <Flag code={c.code} flag={c.flag} />
              <span className="font-display text-sm font-bold leading-tight text-ink">{c.name}</span>
              <span className="text-xs text-ink-soft">Grupo {c.label}</span>
            </button>
          )
        })}
      </div>

      {locked && (
        <p className="mt-3 text-center text-sm font-medium text-lock">
          Las predicciones están cerradas. Solo lectura.
        </p>
      )}

      {wizard ? <WizardFooter>{cta}</WizardFooter> : <div className="mt-6">{cta}</div>}
    </>
  )
}

function ThirdsSkeleton({ wizard }: { wizard: boolean }) {
  return (
    <div className={wizard ? '' : 'mt-2'}>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" aria-busy />
        ))}
      </div>
    </div>
  )
}

function ThirdsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <p className="text-ink-soft">No pudimos cargar los terceros.</p>
      <Button className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

function ThirdsEmpty({ wizard }: { wizard: boolean }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-8 text-center ${wizard ? '' : 'mt-2'}`}>
      <p className="font-display text-lg font-bold text-ink">Aún no hay candidatos suficientes</p>
      <p className="mt-2 text-ink-soft">Completa los 12 grupos primero para elegir los 8 mejores terceros.</p>
    </div>
  )
}
