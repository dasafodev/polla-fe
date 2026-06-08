import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'

interface DevParticipant { id: string; name: string; role: string }

// Panel solo-dev: entrar como cualquier inscrito sin Google y simular el reloj para probar candados.
export function DevLoginPanel() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [participants, setParticipants] = useState<DevParticipant[]>([])
  const [customIso, setCustomIso] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch('/api/__dev__/participants', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setParticipants(d.data))
      .catch(() => setStatus('No se pudo cargar la lista (¿mocks activos?)'))
  }, [])

  async function loginAs(participantId: string) {
    const res = await fetch('/api/__dev__/login-as', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantId }), credentials: 'include',
    })
    if (!res.ok) { setStatus('No se pudo iniciar sesión'); return }
    // Igual que useLogin: sembramos el cache de `me` directamente (no dependemos de un refetch).
    qc.setQueryData(keys.me(), await res.json())
    navigate('/')
  }

  async function applyClock(iso: string | null) {
    await fetch('/api/__dev__/set-now', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iso }), credentials: 'include',
    })
    await qc.invalidateQueries()
    setStatus(`Reloj: ${iso ?? 'real'}`)
  }

  async function reset() {
    await fetch('/api/__dev__/reset', { method: 'POST', credentials: 'include' })
    await qc.invalidateQueries()
    setStatus('Mock reseteado')
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
