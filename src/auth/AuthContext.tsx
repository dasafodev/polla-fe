import { createContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../lib/queryClient'
import { getSession, clearSession } from './session'
import { setUnauthorizedHandler } from '../lib/apiClient'
import { isApiError } from '../lib/errors'
import type { ParticipantMe } from '../types/api'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthValue {
  participant: ParticipantMe | null
  status: AuthStatus
}

export const AuthContext = createContext<AuthValue>({ participant: null, status: 'loading' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  // El API real no tiene /me y la cookie es HttpOnly: la identidad se restaura desde localStorage.
  // Un 401 de cualquier petición real (cookie vencida) limpia el cache y vuelve a unauthenticated.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      qc.invalidateQueries({ queryKey: keys.me() })
    })
    return () => setUnauthorizedHandler(null)
  }, [qc])

  const { data, isLoading, error } = useQuery({
    queryKey: keys.me(),
    queryFn: getSession,
    retry: false, // getSession lee localStorage: un 401 (sin sesión) es definitivo, no se reintenta
  })

  let status: AuthStatus = 'loading'
  if (isLoading) status = 'loading'
  else if (data) status = 'authenticated'
  else if (isApiError(error) && error.status === 401) status = 'unauthenticated'
  else if (error) status = 'error'

  const value = useMemo<AuthValue>(() => ({ participant: data ?? null, status }), [data, status])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
