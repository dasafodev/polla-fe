import { useState } from 'react'
import { useThirds, useSaveThirds } from './hooks'
import { isApiError } from '../../lib/errors'

export function Thirds() {
  const thirds = useThirds()
  const save = useSaveThirds()
  const [picked, setPicked] = useState<string[]>([])
  const [message, setMessage] = useState('')
  if (thirds.isLoading) return <p>Cargando…</p>
  const data = thirds.data?.data ?? []
  const selected = picked.length ? picked : data.filter((c) => c.selected).map((c) => c.teamId)

  function toggle(teamId: string) {
    setPicked((prev) => {
      const base = prev.length ? prev : data.filter((c) => c.selected).map((c) => c.teamId)
      return base.includes(teamId) ? base.filter((x) => x !== teamId) : [...base, teamId]
    })
  }
  function onSave() {
    setMessage('')
    save.mutate({ teamIds: selected }, { onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error') })
  }
  return (
    <div>
      <h1>Mejores terceros ({selected.length}/8)</h1>
      {data.length < 8 && <p>Completa los 12 grupos para tener candidatos suficientes.</p>}
      <ul>
        {data.map((c) => (
          <li key={c.teamId}>
            <label>
              <input type="checkbox" checked={selected.includes(c.teamId)} onChange={() => toggle(c.teamId)} />
              {c.name} ({c.code}) — Grupo {c.label}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={onSave} disabled={save.isPending}>Guardar 8 terceros</button>
      {message && <p role="alert">{message}</p>}
    </div>
  )
}
