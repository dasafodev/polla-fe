import { useAdminParticipants } from './hooks'

export function Participants() {
  const q = useAdminParticipants()
  if (q.isLoading) return <p>Cargando…</p>
  if (q.error) return <p role="alert">Error al cargar participantes</p>
  return (
    <div>
      <h1>Participantes inscritos ({q.data?.data.length ?? 0})</h1>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Puntos</th></tr>
        </thead>
        <tbody>
          {q.data?.data.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td><td>{p.email}</td><td>{p.phone ?? '—'}</td><td>{p.role}</td><td>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
