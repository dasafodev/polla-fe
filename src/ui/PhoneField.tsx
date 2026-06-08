import { useId, useState } from 'react'

interface Country {
  iso: string
  name: string
  dial: string
}

// Lista acotada al público de la polla (Colombia + comunes de la región y diáspora).
export const COUNTRIES: Country[] = [
  { iso: 'CO', name: 'Colombia', dial: '57' },
  { iso: 'MX', name: 'México', dial: '52' },
  { iso: 'AR', name: 'Argentina', dial: '54' },
  { iso: 'PE', name: 'Perú', dial: '51' },
  { iso: 'CL', name: 'Chile', dial: '56' },
  { iso: 'EC', name: 'Ecuador', dial: '593' },
  { iso: 'VE', name: 'Venezuela', dial: '58' },
  { iso: 'PA', name: 'Panamá', dial: '507' },
  { iso: 'CR', name: 'Costa Rica', dial: '506' },
  { iso: 'UY', name: 'Uruguay', dial: '598' },
  { iso: 'PY', name: 'Paraguay', dial: '595' },
  { iso: 'BO', name: 'Bolivia', dial: '591' },
  { iso: 'BR', name: 'Brasil', dial: '55' },
  { iso: 'GT', name: 'Guatemala', dial: '502' },
  { iso: 'DO', name: 'Rep. Dominicana', dial: '1' },
  { iso: 'US', name: 'Estados Unidos', dial: '1' },
  { iso: 'ES', name: 'España', dial: '34' },
  { iso: 'GB', name: 'Reino Unido', dial: '44' },
  { iso: 'IT', name: 'Italia', dial: '39' },
  { iso: 'FR', name: 'Francia', dial: '33' },
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
          className={`min-h-[52px] w-[9.25rem] shrink-0 rounded-control border bg-surface px-3 text-[16px] text-ink focus:outline-none focus:ring-2 focus:ring-violet focus:border-violet ${
            error ? 'border-danger' : 'border-border'
          }`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.name} +{c.dial}
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
