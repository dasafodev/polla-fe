import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helper?: string
  error?: string
}

export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, helper, error, id, className = '', ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error ? `${inputId}-err` : helper ? `${inputId}-help` : undefined
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="font-display font-semibold text-[15px] text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-[52px] rounded-control border bg-surface px-4 text-[16px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet focus:border-violet ${
          error ? 'border-danger' : 'border-border'
        } ${className}`}
        {...rest}
      />
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
})
