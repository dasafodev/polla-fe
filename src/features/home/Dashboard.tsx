import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useLogout } from '../../auth/hooks'

export function Dashboard() {
  const { participant } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()
  return (
    <div>
      <h1>Hola, {participant?.name ?? '…'}</h1>
      <button onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}>Cerrar sesión</button>
    </div>
  )
}
