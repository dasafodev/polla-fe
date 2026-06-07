import { type ReactElement, type ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { makeQueryClient } from '../lib/queryClient'
import { AuthProvider } from '../auth/AuthContext'

export { makeFakeIdToken } from '../mocks/jwt'

// Incluye AuthProvider porque las pantallas autenticadas (Dashboard) leen useAuth().
// AuthProvider hace GET /me al montar; MSW lo resuelve (200 con sesión, 401 sin ella).
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
