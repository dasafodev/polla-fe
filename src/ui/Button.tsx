import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'light' | 'glass'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  fullWidth?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 font-display font-semibold rounded-control ' +
  'min-h-[52px] px-5 text-[16px] transition active:scale-[0.98] disabled:opacity-60 ' +
  'disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-violet focus-visible:ring-offset-2'

const variants: Record<Variant, string> = {
  primary: 'bg-violet text-white shadow-card hover:bg-violet-strong',
  ghost: 'bg-transparent text-ink-soft hover:text-ink',
  light: 'bg-white text-ink border border-border hover:bg-surface-2',
  glass:
    'bg-white/10 text-white border border-white/20 backdrop-blur-md ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-white/15',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', loading = false, fullWidth = false, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
})
