import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useKoMatch, useSaveKoPrediction, useFriendsKo } from './hooks'
import { isApiError } from '../../lib/errors'

export function KoMatchDetail() {
  const { matchId = '' } = useParams()
  const q = useKoMatch(matchId)
  const friends = useFriendsKo(matchId)
  const [scoreHome, setScoreHome] = useState(0)
  const [scoreAway, setScoreAway] = useState(0)
  const [advances, setAdvances] = useState('')
  const [triple, setTriple] = useState(false)
  const [message, setMessage] = useState('')
  const m = q.data
  const hasPrediction = !!m?.myPrediction
  const save = useSaveKoPrediction(matchId, hasPrediction ? 'update' : 'create')

  if (q.isLoading) return <p>Cargando…</p>
  if (!m) return <p role="alert">Partido no encontrado</p>
  const home = m.homeTeam, away = m.awayTeam
  const adv = advances || m.myPrediction?.teamAdvancesId || ''

  function onSave() {
    setMessage('')
    save.mutate({ scoreHome, scoreAway, teamAdvancesId: adv, tripleActive: triple }, {
      onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error'),
    })
  }
  return (
    <div>
      <h1>{(home?.name ?? m.homeTeamLabel)} vs {(away?.name ?? m.awayTeamLabel)}</h1>
      <p>Estado: {m.status} {m.result ? `· Resultado ${m.result.scoreHome}-${m.result.scoreAway}` : ''}</p>
      {home && away ? (
        <fieldset disabled={m.myPrediction?.lockedIn || m.status === 'finished'}>
          <label>Marcador {home.code} <input type="number" min={0} value={scoreHome} onChange={(e) => setScoreHome(+e.target.value)} /></label>
          <label>Marcador {away.code} <input type="number" min={0} value={scoreAway} onChange={(e) => setScoreAway(+e.target.value)} /></label>
          <label>Avanza
            <select value={adv} onChange={(e) => setAdvances(e.target.value)}>
              <option value="">—</option>
              <option value={home.id}>{home.name}</option>
              <option value={away.id}>{away.name}</option>
            </select>
          </label>
          <label><input type="checkbox" checked={triple} onChange={(e) => setTriple(e.target.checked)} /> Triple o nada</label>
          <button onClick={onSave} disabled={save.isPending || !adv}>Guardar</button>
        </fieldset>
      ) : <p>Cruce aún no definido.</p>}
      {message && <p role="alert">{message}</p>}
      <h2>Amigos</h2>
      {friends.isLoading ? <p>Cargando…</p> : friends.data?.available
        ? <ul>{friends.data.data?.map((f) => <li key={f.participant.id}>{f.participant.name}: {f.prediction ? `${f.prediction.scoreHome}-${f.prediction.scoreAway}` : 'sin predicción'}</li>)}</ul>
        : <p>Disponible el {friends.data?.availableAt}</p>}
    </div>
  )
}
