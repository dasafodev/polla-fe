import { Link } from 'react-router-dom'
import { useScoreboard } from './hooks'

export function Scoreboard() {
  const q = useScoreboard()
  if (q.isLoading) return <p>Cargando…</p>
  if (q.error) return <p role="alert">Error al cargar la tabla</p>
  return (
    <div>
      <h1>Tabla de posiciones</h1>
      <ol>
        {q.data?.data.map((e) => (
          <li key={e.participant.id}>
            <Link to={`/tabla/${e.participant.id}`}>#{e.rank} {e.participant.name} — {e.total} pts {e.prize ? `($${e.prize})` : ''}</Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
