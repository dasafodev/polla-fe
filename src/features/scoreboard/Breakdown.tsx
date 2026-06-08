import { useParams } from 'react-router-dom'
import { useBreakdown } from './hooks'
import { useFriendsGroups } from '../groups/hooks'
import { useFriendsPowerups } from '../powerups/hooks'

export function Breakdown() {
  const { participantId = '' } = useParams()
  const q = useBreakdown(participantId)
  const fg = useFriendsGroups()
  const fp = useFriendsPowerups()
  if (q.isLoading) return <p>Cargando…</p>
  if (q.error) return <p role="alert">Participante no encontrado</p>
  const b = q.data!
  return (
    <div>
      <h1>Desglose: {b.participant.name}</h1>
      <p>Total: {b.total} · Triples restantes: {b.tripleUsesRemaining} {b.prize ? `· Premio $${b.prize}` : ''}</p>
      <ul>
        <li>Grupos: {b.breakdown.groups}</li>
        <li>Terceros: {b.breakdown.thirds}</li>
        <li>KO: {b.breakdown.ko}</li>
        <li>Caballo negro: {b.breakdown.darkHorse}</li>
        <li>Decepción: {b.breakdown.disappointment}</li>
      </ul>
      <h2>Amigos — grupos</h2>
      {fg.isLoading ? <p>Cargando…</p> : fg.data?.available
        ? <p>{fg.data.data?.length ?? 0} participantes con predicciones</p>
        : <p>Disponible el {fg.data?.availableAt}</p>}
      <h2>Amigos — powerups</h2>
      {fp.isLoading ? <p>Cargando…</p> : fp.data?.available
        ? <ul>{fp.data.data?.map((f) => <li key={f.participant.id}>{f.participant.name}: 🐴 {f.darkHorse?.code ?? '—'} / 💤 {f.disappointment?.code ?? '—'}</li>)}</ul>
        : <p>Disponible el {fp.data?.availableAt}</p>}
    </div>
  )
}
