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
  const group = groups.data?.data.find((g) => g.id === groupId)
  const existing = mine.data?.data.find((g) => g.groupId === groupId)
  const [order, setOrder] = useState<string[]>(existing?.rankings.map((r) => r.teamId) ?? group?.teams.map((t) => t.id) ?? [])

  if (groups.isLoading || mine.isLoading) return <p>Cargando…</p>
  if (!group) return <p role="alert">Grupo no encontrado</p>

  function move(teamId: string, dir: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(teamId), j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next
    })
  }
  function onSave() {
    setMessage('')
    save.mutate(
      { predictions: [{ groupId, rankings: order.map((teamId, i) => ({ teamId, position: i + 1 })) }] },
      { onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error') },
    )
  }
  return (
    <div>
      <h1>{group.name}</h1>
      <ol>
        {order.map((teamId, i) => {
          const t = group.teams.find((x) => x.id === teamId)!
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
