import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, renderHook } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { renderWithProviders } from '../../test/utils'
import { makeFakeIdToken } from '../../mocks/jwt'
import { makeQueryClient } from '../../lib/queryClient'
import { useLogin } from '../../auth/hooks'
import { GroupDeck } from './GroupDeck'

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => null,
}))

function loginAsJuan() {
  const qc = makeQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return renderHook(() => useLogin(), { wrapper })
}

describe('GroupDeck', () => {
  it('guardar un grupo sube el contador (invalida predictionsMe)', async () => {
    // Pedro no tiene predicciones de grupos sembradas → arranca en 0/12.
    const { result } = loginAsJuan()
    result.current.mutate(makeFakeIdToken({ sub: 'sub-pedro', email: 'pedro@gmail.com', name: 'Pedro' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    renderWithProviders(<GroupDeck />)

    expect(await screen.findByText(/0 de 12 listos/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /listo, siguiente/i }))
    expect(await screen.findByText(/1 de 12 listos/i)).toBeInTheDocument()
  })
})
