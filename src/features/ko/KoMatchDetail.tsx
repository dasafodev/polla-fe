import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useKoMatch, useSaveKoPrediction, useFriendsKo } from './hooks'
import { isApiError } from '../../lib/errors'
import { displayName } from '../../lib/names'
import type { KoMatch } from '../../types/api'

export function KoMatchDetail() {
  const { matchId = '' } = useParams()
  const q = useKoMatch(matchId)
  const friends = useFriendsKo(matchId)

  if (q.isLoading) return <p>Cargando…</p>
  const m = q.data
  if (!m) return <p role="alert">Partido no encontrado</p>
  const home = m.homeTeam, away = m.awayTeam

  return (
    <div>
      <h1>{(home?.name ?? m.homeTeamLabel)} vs {(away?.name ?? m.awayTeamLabel)}</h1>
      <p>Estado: {m.status} {m.result ? `· Resultado ${m.result.scoreHome}-${m.result.scoreAway}` : ''}</p>
      {home && away
        // key={m.id}: remonta (y reinicia el form desde myPrediction) al cambiar de partido.
        ? <PredictionForm key={m.id} matchId={matchId} match={m} isFetching={q.isFetching} />
        : <p>Cruce aún no definido.</p>}
      <h2>Amigos</h2>
      {friends.isLoading ? <p>Cargando…</p> : friends.data?.available
        ? <ul>{friends.data.data?.map((f) => <li key={f.participant.id}>{displayName(f.participant.name)}: {f.prediction ? `${f.prediction.scoreHome}-${f.prediction.scoreAway}` : 'sin predicción'}</li>)}</ul>
        : <p>Disponible el {friends.data?.availableAt}</p>}
    </div>
  )
}

function PredictionForm({ matchId, match, isFetching }: { matchId: string; match: KoMatch; isFetching: boolean }) {
  const mp = match.myPrediction
  // Estado sembrado desde la predicción existente (si la hay): editar y guardar no pisa los valores guardados.
  const [scoreHome, setScoreHome] = useState(mp?.scoreHome ?? 0)
  const [scoreAway, setScoreAway] = useState(mp?.scoreAway ?? 0)
  const [advances, setAdvances] = useState(mp?.teamAdvancesId ?? '')
  const [triple, setTriple] = useState(mp?.tripleActive ?? false)
  const [message, setMessage] = useState('')
  const save = useSaveKoPrediction(matchId, mp ? 'update' : 'create')
  const home = match.homeTeam!, away = match.awayTeam!
  const sanitizeScore = (v: string) => Math.max(0, Math.trunc(+v) || 0)

  function onSave() {
    setMessage('')
    save.mutate({ scoreHome, scoreAway, teamAdvancesId: advances, tripleActive: triple }, {
      onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error'),
    })
  }
  return (
    <>
      {/* locked es del partido (no de mi predicción): cubre el caso candado-sin-predicción. */}
      <fieldset disabled={match.locked || match.status === 'finished'}>
        <label>Marcador {home.code} <input type="number" min={0} value={scoreHome} onChange={(e) => setScoreHome(sanitizeScore(e.target.value))} /></label>
        <label>Marcador {away.code} <input type="number" min={0} value={scoreAway} onChange={(e) => setScoreAway(sanitizeScore(e.target.value))} /></label>
        <label>Avanza
          <select value={advances} onChange={(e) => setAdvances(e.target.value)}>
            <option value="">—</option>
            <option value={home.id}>{home.name}</option>
            <option value={away.id}>{away.name}</option>
          </select>
        </label>
        <label><input type="checkbox" checked={triple} onChange={(e) => setTriple(e.target.checked)} /> Triple o nada</label>
        {/* isFetching: deshabilita mientras refetchea tras un POST, para que el modo pase a 'update' antes del próximo guardado (evita 409). */}
        <button onClick={onSave} disabled={save.isPending || isFetching || !advances}>Guardar</button>
      </fieldset>
      {message && <p role="alert">{message}</p>}
    </>
  )
}
