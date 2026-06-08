import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { makeQueryClient } from '../lib/queryClient'
import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'
import { useLogin, useLogout } from './hooks'
import { makeFakeIdToken } from '../mocks/jwt'

function wrapper() {
  const qc = makeQueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

// Regresión: useLogout no debe usar qc.clear() (deja huérfano el observer de `me`, y un
// setQueryData posterior al loguear otro usuario no actualizaría useAuth).
describe('logout → login con otro usuario actualiza useAuth', () => {
  it('tras logout, loguear a otro participante refleja el nuevo en useAuth', async () => {
    const { result } = renderHook(() => ({ auth: useAuth(), login: useLogin(), logout: useLogout() }), { wrapper: wrapper() })

    result.current.login.mutate(makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }))
    await waitFor(() => expect(result.current.auth.participant?.id).toBe('p-juan'))

    result.current.logout.mutate()
    await waitFor(() => expect(result.current.auth.status).toBe('unauthenticated'))

    result.current.login.mutate(makeFakeIdToken({ sub: 'sub-maria', email: 'maria@gmail.com', name: 'María' }))
    await waitFor(() => expect(result.current.auth.participant?.id).toBe('p-maria'))
  })
})
