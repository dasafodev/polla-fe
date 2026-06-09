import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignOut, Question } from '@phosphor-icons/react'
import { useAuth } from '../../../auth/useAuth'
import { useLogout } from '../../../auth/hooks'
import { Avatar } from '../../../ui/Avatar'
import { RulesSheet } from '../../rules/RulesSheet'

export function DashboardHeader({ subtitle }: { subtitle: string }) {
  const { participant } = useAuth()
  const logout = useLogout()
  const nav = useNavigate()
  const [menu, setMenu] = useState(false)
  const [rules, setRules] = useState(false)
  const name = participant?.name ?? '…'

  return (
    <header className="flex items-center justify-between pt-2">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Hola, {name}</h1>
        <p className="text-sm text-ink-soft">{subtitle}</p>
      </div>
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} aria-label="Tu cuenta" className="active:scale-95">
          <Avatar name={name} />
        </button>
        {menu && (
          <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-border bg-surface p-1 shadow-diffuse">
            <button
              onClick={() => { setMenu(false); setRules(true) }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-ink hover:bg-surface-2"
            >
              <Question size={18} weight="bold" /> Cómo se juega
            </button>
            <button
              onClick={() => logout.mutate(undefined, { onSuccess: () => nav('/login') })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-ink hover:bg-surface-2"
            >
              <SignOut size={18} weight="bold" /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
      <RulesSheet open={rules} onClose={() => setRules(false)} />
    </header>
  )
}
