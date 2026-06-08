import { useState } from 'react'
import { useGroups } from '../groups/hooks'
import { usePowerups, useSavePowerups } from './hooks'
import { isApiError } from '../../lib/errors'

export function PowerupsForm() {
  const groups = useGroups()
  const mine = usePowerups()
  // null = sin editar (usa el valor guardado); '' = el usuario lo limpió a "—" (estado válido).
  const [darkHorse, setDarkHorse] = useState<string | null>(null)
  const [disappointment, setDisappointment] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const hasPowerups = !!(mine.data?.darkHorse || mine.data?.disappointment)
  const save = useSavePowerups(hasPowerups ? 'update' : 'create')

  if (groups.isLoading || mine.isLoading) return <p>Cargando…</p>
  const teams = (groups.data?.data ?? []).flatMap((g) => g.teams)
  const notTop8 = teams.filter((t) => !t.isTop8)
  const top8 = teams.filter((t) => t.isTop8)
  const dh = darkHorse ?? mine.data?.darkHorse?.teamId ?? ''
  const dis = disappointment ?? mine.data?.disappointment?.teamId ?? ''

  function onSave() {
    setMessage('')
    save.mutate({ darkHorseTeamId: dh, disappointmentTeamId: dis }, {
      onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error'),
    })
  }
  return (
    <div>
      <h1>Powerups</h1>
      <label htmlFor="dh">Caballo negro (fuera del top 8)</label>
      <select id="dh" value={dh} onChange={(e) => setDarkHorse(e.target.value)}>
        <option value="">—</option>
        {notTop8.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
      </select>
      <label htmlFor="dis">Decepción (dentro del top 8)</label>
      <select id="dis" value={dis} onChange={(e) => setDisappointment(e.target.value)}>
        <option value="">—</option>
        {top8.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
      </select>
      <button onClick={onSave} disabled={save.isPending || !dh || !dis}>{hasPowerups ? 'Actualizar' : 'Guardar'}</button>
      {message && <p role="alert">{message}</p>}
    </div>
  )
}
