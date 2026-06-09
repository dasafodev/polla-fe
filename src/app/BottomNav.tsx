import { NavLink } from 'react-router-dom'
import { House, ListChecks, Trophy, Shield } from '@phosphor-icons/react'
import { useAuth } from '../auth/useAuth'

const items = [
  { to: '/', label: 'Inicio', Icon: House, end: true },
  { to: '/predicciones', label: 'Predicciones', Icon: ListChecks, end: false },
  { to: '/tabla', label: 'Tabla', Icon: Trophy, end: false },
]

export function BottomNav() {
  const { participant } = useAuth()
  const all =
    participant?.role === 'admin'
      ? [...items, { to: '/admin', label: 'Admin', Icon: Shield, end: false }]
      : items
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-2">
        {all.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-violet' : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={24} weight={isActive ? 'fill' : 'regular'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
