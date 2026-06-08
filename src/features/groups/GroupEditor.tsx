import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGroups, useMyGroupPredictions, useSaveGroupPredictions } from './hooks'
import { isApiError } from '../../lib/errors'

export function GroupEditor() {
  const { groupId = '' } = useParams()
  const groups = useGroups()
  const mine = useMyGroupPredictions()
  const save = useSaveGroupPredictions()
  const [message, setMessage] = useState('')
  // null = sin reordenar aún → deriva del server (que puede no haber cargado en el primer render).
  const [order, setOrder] = useState<string[] | null>(null)

  if (groups.isLoading || mine.isLoading) return <p>Cargando…</p>
  const group = groups.data?.data.find((g) => g.id === groupId)
  if (!group) return <p role="alert">Grupo no encontrado</p>
  const existing = mine.data?.data.find((g) => g.groupId === groupId)
  const effectiveOrder = order ?? existing?.rankings.map((r) => r.teamId) ?? group.teams.map((t) => t.id)

  function move(teamId: string, dir: -1 | 1) {
    const i = effectiveOrder.indexOf(teamId), j = i + dir
    if (i < 0 || j < 0 || j >= effectiveOrder.length) return
    const next = [...effectiveOrder]; [next[i], next[j]] = [next[j], next[i]]
    setOrder(next)
  }
  function onSave() {
    setMessage('')
    save.mutate(
      { predictions: [{ groupId, rankings: effectiveOrder.map((teamId, i) => ({ teamId, position: i + 1 })) }] },
      { onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error') },
    )
  }
  return (
    <div>
      <h1>{group.name}</h1>
      <ol>
        {effectiveOrder.map((teamId, i) => {
          const t = group.teams.find((x) => x.id === teamId)
          if (!t) return null
          return (
            <li key={teamId}>
              {i + 1}. {t.name} ({t.code}){t.isTop8 ? ' ★' : ''}
              <button onClick={() => move(teamId, -1)}>↑</button>
              <button onClick={() => move(teamId, 1)}>↓</button>
            </li>
          )
        })}
      </ol>
      <button onClick={onSave} disabled={save.isPending}>Guardar</button>
      {message && <p role="alert">{message}</p>}
    </div>
  )
}
