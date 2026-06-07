import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignup } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'

const E164 = /^\+[1-9]\d{7,14}$/

export function Signup({ credential, onNeedRelogin }: { credential: string; onNeedRelogin: () => void }) {
  const navigate = useNavigate()
  const signup = useSignup()
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    if (!code.trim()) return setMessage('Ingresa el código de invitación')
    if (!E164.test(phone)) return setMessage('Formato inválido. Usa E.164 ej: +573001234567')
    signup.mutate(
      { credential, code: code.trim(), phone },
      {
        onSuccess: () => navigate('/'),
        onError: (err) => {
          if (isApiError(err) && err.code === 'INVALID_GOOGLE_TOKEN') onNeedRelogin()
          else setMessage(isApiError(err) ? err.message : 'No se pudo crear la cuenta')
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit}>
      <h1>Completa tu registro</h1>
      <label htmlFor="code">Código de invitación</label>
      <input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
      <label htmlFor="phone">Teléfono (E.164)</label>
      <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+573001234567" />
      <button type="submit">Crear cuenta</button>
      {message && <p role="alert">{message}</p>}
    </form>
  )
}
