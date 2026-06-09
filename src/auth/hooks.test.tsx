import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { makeQueryClient } from '../lib/queryClient'
import { useLogin, useSignup } from './hooks'
import { makeFakeIdToken } from '../mocks/jwt'
import { isApiError } from '../lib/errors'

function wrapper() {
  const qc = makeQueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useLogin', () => {
  it('resuelve con el participante existente', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })
    result.current.mutate(makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ id: 'p-juan' })
  })
  it('rechaza con NEEDS_SIGNUP si el usuario no está inscrito', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })
    result.current.mutate(makeFakeIdToken({ sub: 'sub-x', email: 'x@x.com', name: 'X' }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    const err = result.current.error
    expect(isApiError(err) && err.code).toBe('NEEDS_SIGNUP')
  })
})

describe('useSignup', () => {
  it('crea cuenta con código válido', async () => {
    const { result } = renderHook(() => useSignup(), { wrapper: wrapper() })
    result.current.mutate({ credential: makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' }), code: 'OK1234', phone: '+573001234567' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ email: 'n@x.com' })
  })
})
