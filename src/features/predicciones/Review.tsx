import { type ReactNode } from 'react'
import { useMyGroupPredictions, useThirds } from '../groups/hooks'
import { usePowerups } from '../powerups/hooks'
import { Card } from '../../ui/Card'

export function Review() {
  const groups = useMyGroupPredictions()
  const thirds = useThirds()
  const powerups = usePowerups()
  if (groups.isLoading || thirds.isLoading || powerups.isLoading) return <ReviewSkeleton />

  const completed = groups.data?.completedGroups ?? 0
  const thirdsCount = thirds.data?.selectedCount ?? 0
  const darkHorse = powerups.data?.darkHorse?.name ?? '—'
  const disappointment = powerups.data?.disappointment?.name ?? '—'

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-ink">Revisar</h1>
        <p className="mt-1 text-ink-soft">Un vistazo a todas tus predicciones.</p>
      </header>
      <Card className="divide-y divide-border">
        <Row label="Grupos">{completed}/12 completos</Row>
        <Row label="Mejores terceros">{thirdsCount}/8 elegidos</Row>
        <Row label="Caballo oscuro">{darkHorse}</Row>
        <Row label="La decepción">{disappointment}</Row>
      </Card>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <span className="font-medium text-ink">{label}</span>
      <span className="text-right font-mono text-sm font-bold text-ink-soft">{children}</span>
    </div>
  )
}

function ReviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-32 animate-pulse rounded bg-surface-2" aria-busy />
      <div className="h-56 animate-pulse rounded-card bg-surface-2" />
    </div>
  )
}
