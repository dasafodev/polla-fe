import { Link, useParams } from 'react-router-dom'
import { useKoMatches } from './hooks'
import type { RoundSlug } from '../../types/enums'

export function KoRoundDetail() {
  const { round = 'r32' } = useParams()
  const q = useKoMatches(round as RoundSlug)
  if (q.isLoading) return <p>Cargando…</p>
  if (q.error) return <p role="alert">Error al cargar la ronda</p>
  return (
    <div>
      <h1>{q.data?.round.name}</h1>
      <ul>
        {q.data?.matches.map((m) => (
          <li key={m.id}>
            <Link to={`/eliminatorias/partido/${m.id}`}>
              {(m.homeTeam?.name ?? m.homeTeamLabel)} vs {(m.awayTeam?.name ?? m.awayTeamLabel)} [{m.status}]
              {m.result ? ` ${m.result.scoreHome}-${m.result.scoreAway}` : ''}
              {m.myPrediction ? ' ✎' : ''}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
