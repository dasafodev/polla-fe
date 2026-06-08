import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <main>{children}</main>
      <nav>
        <Link to="/">Inicio</Link> | <Link to="/predicciones">Predicciones</Link> |{' '}
        <Link to="/eliminatorias">Eliminatorias</Link> | <Link to="/tabla">Tabla</Link>
      </nav>
    </div>
  )
}
