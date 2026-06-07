import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <div>Cargando…</div>
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (status === 'error') return <div>Error de conexión. <button onClick={() => location.reload()}>Reintentar</button></div>
  return <>{children}</>
}
