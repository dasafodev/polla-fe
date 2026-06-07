import { createContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { keys } from '../lib/queryClient'
import { getMe } from './api'
import { isApiError } from '../lib/errors'
import type { ParticipantMe } from '../types/api'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthValue {
  participant: ParticipantMe | null
  status: AuthStatus
}

export const AuthContext = createContext<AuthValue>({ participant: null, status: 'loading' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: keys.me(),
    queryFn: getMe,
    retry: (count, e) => !(isApiError(e) && e.status === 401) && count < 2, // no reintentar el 401 esperado de /me
  })

  let status: AuthStatus = 'loading'
  if (isLoading) status = 'loading'
  else if (data) status = 'authenticated'
  else if (isApiError(error) && error.status === 401) status = 'unauthenticated'
  else if (error) status = 'error'

  return <AuthContext.Provider value={{ participant: data ?? null, status }}>{children}</AuthContext.Provider>
}
