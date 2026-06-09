import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../lib/queryClient'
import { postLogin, postSignup, postLogout } from './api'
import { saveSession, clearSession } from './session'
import type { SignupBody } from '../types/api'

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (credential: string) => postLogin({ credential }),
    onSuccess: (me) => {
      saveSession(me) // cachea la identidad para sobrevivir a un reload (el API real no tiene /me)
      qc.setQueryData(keys.me(), me)
    },
  })
}

export function useSignup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SignupBody) => postSignup(body),
    onSuccess: (me) => {
      saveSession(me)
      qc.setQueryData(keys.me(), me)
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => postLogout(),
    // No usar qc.clear(): elimina la query `me` y deja huérfano su observer (un setQueryData posterior
    // al loguear otro usuario no actualizaría la UI). clearSession() borra el cache de identidad y
    // resetQueries() refetchea las activas: `me` → getSession lee localStorage vacío → 401 →
    // unauthenticated, con el observer vivo para el próximo login.
    onSuccess: () => {
      clearSession()
      qc.resetQueries()
    },
  })
}
