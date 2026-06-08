import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function AppShell({ children }: { children: ReactNode }) {
  const { participant } = useAuth()
  return (
    <div>
      <main>{children}</main>
      <nav>
        <Link to="/">Inicio</Link> | <Link to="/predicciones">Predicciones</Link> |{' '}
        <Link to="/eliminatorias">Eliminatorias</Link> | <Link to="/tabla">Tabla</Link>
        {participant?.role === 'admin' && <> | <Link to="/admin">Admin</Link></>}
      </nav>
    </div>
  )
}
