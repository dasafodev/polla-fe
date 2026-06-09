import { type ReactNode } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { makeQueryClient } from '../../lib/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import { seedSession } from '../../test/utils'
import { useMyTotals } from './hooks'

function makeWrapper() {
  const client = makeQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('useMyTotals', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })
  it('devuelve el desglose del participante actual', async () => {
    const { result } = renderHook(() => useMyTotals(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.data?.total).toBe(463))
    expect(result.current.data?.breakdown.groups).toBe(360)
  })
})
