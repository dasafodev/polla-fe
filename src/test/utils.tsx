import { type ReactElement, type ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { makeQueryClient } from '../lib/queryClient'
import { AuthProvider } from '../auth/AuthContext'
import { saveSession } from '../auth/session'
import { db } from '../mocks/db'

export { makeFakeIdToken } from '../mocks/jwt'

/**
 * Abre sesión en el mock (cookie simulada vía db.currentSessionId) y cachea la identidad en
 * localStorage, igual que useLogin. AuthProvider restaura la sesión desde localStorage (el API real
 * no tiene /me), así que sembrar sólo db.currentSessionId ya no basta para quedar autenticado.
 */
export function seedSession(participantId: string): void {
  const p = db.participants.find((x) => x.id === participantId)
  if (!p) throw new Error(`seedSession: participante ${participantId} no existe en el seed`)
  db.currentSessionId = p.id
  saveSession({ id: p.id, name: p.name, email: p.email, role: p.role })
}

// Incluye AuthProvider porque las pantallas autenticadas (Dashboard) leen useAuth().
// AuthProvider restaura la identidad desde localStorage al montar (usa seedSession en tests).
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = makeQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper }) }
}
