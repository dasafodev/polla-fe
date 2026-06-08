import { useId, useState } from 'react'

interface Country {
  iso: string
  name: string
  dial: string
  flag: string
}

// Lista acotada al público de la polla (Colombia + comunes de la región y diáspora).
// `flag` es emoji bandera: el <select> nativo solo admite texto, y así se ve la bandera
// dentro del selector nativo (ideal en móvil). En desktop sin soporte degrada a las letras del país.
export const COUNTRIES: Country[] = [
  { iso: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴' },
  { iso: 'MX', name: 'México', dial: '52', flag: '🇲🇽' },
  { iso: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷' },
  { iso: 'PE', name: 'Perú', dial: '51', flag: '🇵🇪' },
  { iso: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱' },
  { iso: 'EC', name: 'Ecuador', dial: '593', flag: '🇪🇨' },
  { iso: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪' },
  { iso: 'PA', name: 'Panamá', dial: '507', flag: '🇵🇦' },
  { iso: 'CR', name: 'Costa Rica', dial: '506', flag: '🇨🇷' },
  { iso: 'UY', name: 'Uruguay', dial: '598', flag: '🇺🇾' },
  { iso: 'PY', name: 'Paraguay', dial: '595', flag: '🇵🇾' },
  { iso: 'BO', name: 'Bolivia', dial: '591', flag: '🇧🇴' },
  { iso: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷' },
  { iso: 'GT', name: 'Guatemala', dial: '502', flag: '🇬🇹' },
  { iso: 'DO', name: 'Rep. Dominicana', dial: '1', flag: '🇩🇴' },
  { iso: 'US', name: 'Estados Unidos', dial: '1', flag: '🇺🇸' },
  { iso: 'ES', name: 'España', dial: '34', flag: '🇪🇸' },
  { iso: 'GB', name: 'Reino Unido', dial: '44', flag: '🇬🇧' },
  { iso: 'IT', name: 'Italia', dial: '39', flag: '🇮🇹' },
  { iso: 'FR', name: 'Francia', dial: '33', flag: '🇫🇷' },
]

const dialOf = (iso: string) => COUNTRIES.find((c) => c.iso === iso)?.dial ?? '57'

export function PhoneField({
  label,
  helper,
  error,
  onChange,
}: {
  label: string
  helper?: string
  error?: string
  onChange: (e164: string) => void
}) {
  const [iso, setIso] = useState('CO')
  const [num, setNum] = useState('')
  const inputId = useId()
  const describedBy = error ? `${inputId}-err` : helper ? `${inputId}-help` : undefined

  function emit(nextIso: string, nextNum: string) {
    const digits = nextNum.replace(/\D/g, '')
    onChange(digits ? `+${dialOf(nextIso)}${digits}` : '')
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="font-display font-semibold text-[15px] text-ink">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          aria-label="País"
          value={iso}
          onChange={(e) => {
            setIso(e.target.value)
            emit(e.target.value, num)
          }}
          className={`min-h-[52px] w-[6.5rem] shrink-0 rounded-control border bg-surface px-3 text-[18px] text-ink focus:outline-none focus:ring-2 focus:ring-violet focus:border-violet ${
            error ? 'border-danger' : 'border-border'
          }`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso} aria-label={`${c.name} +${c.dial}`}>
              {c.flag} +{c.dial}
            </option>
          ))}
        </select>
        <input
          id={inputId}
          value={num}
          onChange={(e) => {
            setNum(e.target.value)
            emit(iso, e.target.value)
          }}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="300 123 4567"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`min-h-[52px] w-full min-w-0 flex-1 rounded-control border bg-surface px-4 text-[16px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet focus:border-violet ${
            error ? 'border-danger' : 'border-border'
          }`}
        />
      </div>
      {error ? (
        <p id={`${inputId}-err`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : helper ? (
        <p id={`${inputId}-help`} className="text-[13px] text-ink-soft">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
