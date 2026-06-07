import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'

let nextCredential = ''
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: nextCredential })}>Google</button>
  ),
}))

import { makeFakeIdToken } from '../../mocks/jwt'
import { useLogin } from '../../auth/hooks'
import { Dashboard } from './Dashboard'

beforeEach(() => { nextCredential = '' })

describe('Dashboard', () => {
  it('muestra el nombre del participante autenticado', async () => {
    // login previo para abrir sesión en el mock
    const { result } = renderHookLogin()
    result.current.mutate(makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    renderWithProviders(<Dashboard />)
    expect(await screen.findByText(/hola, juan/i)).toBeInTheDocument()
  })

  it('NO persiste nada sensible en storage tras login', async () => {
    const { result } = renderHookLogin()
    result.current.mutate(makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
})

// helper local: renderiza solo el hook de login con providers
import { renderHook } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { makeQueryClient } from '../../lib/queryClient'
function renderHookLogin() {
  const qc = makeQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  return renderHook(() => useLogin(), { wrapper })
}
