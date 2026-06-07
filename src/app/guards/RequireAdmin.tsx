import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, participant } = useAuth()
  if (status === 'loading') return <div>Cargando…</div>
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  if (participant?.role !== 'admin') return <div>Acceso denegado</div>
  return <>{children}</>
}
