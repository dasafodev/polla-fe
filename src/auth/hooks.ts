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
    onSuccess: () => qc.clear(),
  })
}
