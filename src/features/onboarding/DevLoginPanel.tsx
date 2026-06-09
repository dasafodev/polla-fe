import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { request } from '../../lib/apiClient'
import { saveSession } from '../../auth/session'
import type { ParticipantMe } from '../../types/api'

interface DevParticipant { id: string; name: string; role: string }

// Panel solo-dev: entrar como cualquier inscrito sin Google y simular el reloj para probar candados.
export function DevLoginPanel() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [participants, setParticipants] = useState<DevParticipant[]>([])
  const [customIso, setCustomIso] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    request<{ data: DevParticipant[] }>('GET', '/__dev__/participants')
      .then((d) => setParticipants(d.data))
      .catch(() => setStatus('No se pudo cargar la lista (¿mocks activos?)'))
  }, [])

  async function loginAs(participantId: string) {
    try {
      // Igual que useLogin: cacheamos la identidad (para sobrevivir al refetch de `me`) y sembramos el cache…
      const me = await request<ParticipantMe>('POST', '/__dev__/login-as', { body: { participantId } })
      saveSession(me)
      qc.setQueryData(keys.me(), me)
      // …pero además invalidamos todo: las queries no keyeadas por participante (scoreboard, friends, ko)
      // servirían datos del usuario anterior al cambiar de sesión sin pasar por logout (que hace resetQueries).
      await qc.invalidateQueries()
      navigate('/')
    } catch {
      setStatus('No se pudo iniciar sesión')
    }
  }

  async function applyClock(iso: string | null) {
    try {
      await request('POST', '/__dev__/set-now', { body: { iso } })
      await qc.invalidateQueries()
      setStatus(`Reloj: ${iso ?? 'real'}`)
    } catch {
      setStatus('ISO inválido')
    }
  }

  async function reset() {
    await request('POST', '/__dev__/reset')
    await qc.invalidateQueries()
    setStatus('Mock reseteado')
  }

  async function emptyWorld() {
    try {
      const me = await request<ParticipantMe>('POST', '/__dev__/empty-world')
      saveSession(me)
      qc.setQueryData(keys.me(), me)
      await qc.invalidateQueries()
      navigate('/')
    } catch {
      setStatus('No se pudo crear el mundo vacío')
    }
  }

  return (
    <div>
      <hr />
      <h2>Dev bypass (solo dev + mocks)</h2>
      <p>Entrar como:</p>
      <ul>
        {participants.map((p) => (
          <li key={p.id}>
            <button onClick={() => loginAs(p.id)}>{p.name} ({p.role})</button>
          </li>
        ))}
      </ul>
      <p>O empezar de cero:</p>
      <button onClick={emptyWorld}>Mundo vacío (usuario nuevo)</button>
      <p>Reloj simulado (candados):</p>
      <button onClick={() => applyClock('2026-06-06T12:00:00.000Z')}>Antes del torneo (grupos abiertos)</button>
      <button onClick={() => applyClock('2026-06-11T16:00:00.000Z')}>Torneo iniciado (candado)</button>
      <button onClick={() => applyClock(null)}>Reloj real</button>
      <button onClick={reset}>Reset mock</button>
      <div>
        <input placeholder="ISO p.ej. 2026-06-29T15:00:00Z" value={customIso} onChange={(e) => setCustomIso(e.target.value)} />
        <button onClick={() => applyClock(customIso || null)}>Aplicar ISO</button>
      </div>
      {status && <p role="status">{status}</p>}
    </div>
  )
}
