import { Link } from 'react-router-dom'
import { useGroups, useMyGroupPredictions } from './hooks'

export function GroupsList() {
  const groups = useGroups()
  const mine = useMyGroupPredictions()
  if (groups.isLoading || mine.isLoading) return <p>Cargando…</p>
  if (groups.error) return <p role="alert">Error al cargar grupos</p>
  const completeById = new Map((mine.data?.data ?? []).map((g) => [g.groupId, g.groupComplete]))
  return (
    <div>
      <h1>Grupos ({mine.data?.completedGroups ?? 0}/12 completos)</h1>
      <ul>
        {groups.data?.data.map((g) => (
          <li key={g.id}>
            <Link to={`/predicciones/grupos/${g.id}`}>{g.name}</Link> {completeById.get(g.id) ? '✓' : '—'}
          </li>
        ))}
      </ul>
    </div>
  )
}
