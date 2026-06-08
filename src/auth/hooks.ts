import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../lib/queryClient'
import { postLogin, postSignup, postLogout } from './api'
import type { SignupBody } from '../types/api'

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (credential: string) => postLogin({ credential }),
    onSuccess: (me) => qc.setQueryData(keys.me(), me),
  })
}

export function useSignup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SignupBody) => postSignup(body),
    onSuccess: (me) => qc.setQueryData(keys.me(), me),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => postLogout(),
    // No usar qc.clear(): elimina la query `me` y deja huérfano su observer (un setQueryData posterior
    // al loguear otro usuario no actualizaría la UI). resetQueries() resetea el cache (borra el `data`
    // previo, evitando que un 401 quede "authenticated" por data persistente) y refetchea las queries
    // activas: `me` → 401 → unauthenticated, con el observer vivo para el próximo login.
    onSuccess: () => qc.resetQueries(),
  })
}
