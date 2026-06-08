import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSignup } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'
import { Field } from '../../ui/Field'
import { Button } from '../../ui/Button'
import { fadeUp, stagger } from '../../ui/motion'

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
    <div className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center px-6 py-10">
      <motion.form
        variants={stagger}
        initial="hidden"
        animate="show"
        onSubmit={onSubmit}
        className="flex flex-col gap-6"
      >
        <motion.div variants={fadeUp}>
          <h1 className="font-display text-2xl font-extrabold text-ink">Ya casi estás dentro</h1>
          <p className="mt-1 text-ink-soft">Confirma tu invitación y tu WhatsApp para crear tu cuenta.</p>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field
            label="Código de invitación"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            placeholder="Ej: MUNDIAL26"
            helper="Te lo compartió quien te invitó."
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field
            label="Teléfono (WhatsApp)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="+573001234567"
            helper="Formato internacional, con +57."
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Button type="submit" fullWidth loading={signup.isPending}>
            Crear cuenta
          </Button>
          {message && (
            <p role="alert" className="mt-3 text-center text-sm text-danger">
              {message}
            </p>
          )}
        </motion.div>
      </motion.form>
    </div>
  )
}
