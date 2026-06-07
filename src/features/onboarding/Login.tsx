import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useLogin } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'
import { Signup } from './Signup'

export function Login() {
  const navigate = useNavigate()
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

  if (login.isSuccess) return <div>Redirigiendo…</div>
  if (showSignup && credential) {
    return <Signup credential={credential} onNeedRelogin={() => { setShowSignup(false); setCredential(null); setMessage('Tu sesión de Google expiró, inicia de nuevo.') }} />
  }

  return (
    <div>
      <h1>Polla Mundial 2026</h1>
      <GoogleLogin onSuccess={onSuccess} onError={() => setMessage('No se pudo iniciar con Google')} />
      {message && <p role="alert">{message}</p>}
    </div>
  )
}
