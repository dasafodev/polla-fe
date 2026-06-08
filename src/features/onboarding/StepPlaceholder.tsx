import { LockSimple, Sparkle } from '@phosphor-icons/react'
import { Card } from '../../ui/Card'

export function StepPlaceholder({ kind, enabled = true }: { kind: 'thirds' | 'powerups'; enabled?: boolean }) {
  const copy =
    kind === 'thirds'
      ? {
          t: 'Mejores terceros',
          d: 'Cuando termines los 12 grupos, aquí eliges los 8 terceros que crees que clasifican.',
        }
      : { t: 'Powerups', d: 'Elige tu caballo oscuro y tu decepción del torneo para sumar puntos extra.' }
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-tint text-violet">
        {kind === 'thirds' ? <LockSimple size={28} weight="bold" /> : <Sparkle size={28} weight="bold" />}
      </span>
      <h2 className="font-display text-lg font-bold text-ink">{copy.t}</h2>
      <p className="max-w-[34ch] text-ink-soft">{copy.d}</p>
      {!enabled && <p className="text-sm font-medium text-lock">Disponible al completar los grupos</p>}
      <p className="mt-2 text-sm text-muted">Próximamente en esta versión</p>
    </Card>
  )
}
