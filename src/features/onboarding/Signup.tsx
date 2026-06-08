import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ShieldCheck } from '@phosphor-icons/react'
import { useSignup } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'
import { Field } from '../../ui/Field'
import { PhoneField } from '../../ui/PhoneField'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { fadeUp, stagger } from '../../ui/motion'

const E164 = /^\+[1-9]\d{7,14}$/

export function Signup({
  credential,
  presetCode,
  onNeedRelogin,
}: {
  credential: string
  presetCode?: string
  onNeedRelogin: () => void
}) {
  const navigate = useNavigate()
  const signup = useSignup()
  const [code, setCode] = useState(presetCode ?? '')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const hasPresetCode = !!presetCode

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    if (!code.trim()) return setMessage('Ingresa el código de invitación')
    if (!E164.test(phone)) return setMessage('Ingresa un número de teléfono válido')
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
    <div className="relative mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center px-6 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56"
        style={{ background: 'linear-gradient(180deg, #eee8fd 0%, transparent 100%)' }}
        aria-hidden
      />
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">
        <motion.div variants={fadeUp} className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute inset-0 -z-10 rounded-[24px] bg-violet-light/40 blur-xl" />
            <img src="/logo.png" alt="" width={64} height={64} className="rounded-[20px] shadow-card" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Ya casi estás dentro</h1>
          <p className="mt-1 text-ink-soft">Confirma tus datos y entra a la polla.</p>
        </motion.div>

        <motion.form variants={fadeUp} onSubmit={onSubmit}>
          <Card className="flex flex-col gap-5 p-6">
            {hasPresetCode ? (
              <div className="flex items-center gap-3 rounded-control border border-success/30 bg-[#e6f4ee] px-4 py-3">
                <Check size={20} weight="bold" className="text-success" />
                <span className="text-[15px] font-medium text-ink">Invitación aplicada</span>
              </div>
            ) : (
              <Field
                label="Código de invitación"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
                placeholder="Ej: MUNDIAL26"
                helper="Te lo compartió quien te invitó."
              />
            )}

            <PhoneField
              label="Teléfono (WhatsApp)"
              helper="Elige tu país y escribe tu número."
              onChange={setPhone}
            />

            <Button type="submit" fullWidth loading={signup.isPending}>
              Crear cuenta
            </Button>

            {message && (
              <p role="alert" className="text-center text-sm text-danger">
                {message}
              </p>
            )}
          </Card>
        </motion.form>

        <motion.p variants={fadeUp} className="flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck size={14} weight="bold" /> Tus datos se usan solo para la polla.
        </motion.p>
      </motion.div>
    </div>
  )
}
