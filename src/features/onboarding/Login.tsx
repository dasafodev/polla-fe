import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import { useLogin } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'
import { env } from '../../lib/env'
import { NavyBackdrop } from '../../ui/Backdrop'
import { fadeUp, stagger } from '../../ui/motion'
import { Signup } from './Signup'
import { DevLoginPanel } from './DevLoginPanel'

export function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const presetCode = params.get('code') ?? undefined
  const login = useLogin()
  const [credential, setCredential] = useState<string | null>(null)
  const [showSignup, setShowSignup] = useState(false)
  const [message, setMessage] = useState('')

  function onSuccess(resp: { credential?: string }) {
    if (!resp.credential) return
    setCredential(resp.credential)
    setMessage('')
    login.mutate(resp.credential, {
      onSuccess: () => navigate('/'),
      onError: (e) => {
        if (isApiError(e) && e.code === 'USER_NOT_FOUND') setShowSignup(true)
        else setMessage(isApiError(e) ? e.message : 'Error al iniciar sesión')
      },
    })
  }

  if (login.isSuccess) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-navy text-white">
        <p className="font-display text-lg">Redirigiendo…</p>
      </div>
    )
  }
  if (showSignup && credential) {
    return (
      <Signup
        credential={credential}
        presetCode={presetCode}
        onNeedRelogin={() => {
          setShowSignup(false)
          setCredential(null)
          setMessage('Tu sesión de Google expiró, inicia de nuevo.')
        }}
      />
    )
  }

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-6 text-white">
      <NavyBackdrop />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
      >
        <motion.div variants={fadeUp} className="relative mb-8">
          <div className="absolute inset-0 -z-10 rounded-[28px] bg-violet-light/30 blur-2xl" />
          <img src="/logo.png" alt="Polla Mundial 2026" width={92} height={92} className="rounded-[26px] shadow-diffuse" />
        </motion.div>

        <motion.h1 variants={fadeUp} className="font-display text-4xl font-black leading-tight tracking-tight">
          POLLA
          <br />
          <span className="text-violet-light">MUNDIAL</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-2 font-mono text-sm font-bold tracking-[0.3em] text-white/70">
          2026
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 w-full">
          <div className="flex justify-center">
            <GoogleLogin onSuccess={onSuccess} onError={() => setMessage('No se pudo iniciar con Google')} />
          </div>
          {login.isPending && <p className="mt-3 text-sm text-violet-light">Entrando…</p>}
          {message && (
            <p role="alert" className="mt-3 text-sm text-[#ffb4ae]">
              {message}
            </p>
          )}
        </motion.div>
      </motion.div>

      {import.meta.env.DEV && env.useMocks && (
        <div className="relative z-10 mt-6 w-full max-w-sm text-white/80">
          <DevLoginPanel />
        </div>
      )}
    </div>
  )
}
