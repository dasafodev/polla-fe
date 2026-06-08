import { useMyGroupPredictions, useThirds } from '../groups/hooks'
import { usePowerups } from '../powerups/hooks'

export function Review() {
  const groups = useMyGroupPredictions()
  const thirds = useThirds()
  const powerups = usePowerups()
  if (groups.isLoading || thirds.isLoading || powerups.isLoading) return <p>Cargando…</p>
  return (
    <div>
      <h1>Revisar predicciones</h1>
      <p>Grupos completos: {groups.data?.completedGroups ?? 0}/12</p>
      <p>Terceros seleccionados: {thirds.data?.selectedCount ?? 0}/8</p>
      <p>Caballo negro: {powerups.data?.darkHorse?.name ?? '—'}</p>
      <p>Decepción: {powerups.data?.disappointment?.name ?? '—'}</p>
    </div>
  )
}
