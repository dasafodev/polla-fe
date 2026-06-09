import { Fragment } from 'react'
import { Card } from '../../../ui/Card'
import { useCountdown } from '../useCountdown'

const UNITS = [
  { key: 'days', label: 'días' },
  { key: 'hours', label: 'hrs' },
  { key: 'minutes', label: 'min' },
  { key: 'seconds', label: 'seg' },
] as const

// Cuenta regresiva en vivo al primer partido del Mundial (= cierre de pronósticos).
export function MatchCountdown({ targetIso }: { targetIso: string }) {
  const c = useCountdown(targetIso)

  if (c.done) {
    return (
      <Card className="p-4 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">El primer partido</p>
        <p className="mt-1 font-display text-xl font-black text-ink">¡Arrancó el Mundial!</p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <p className="text-center font-mono text-[10px] font-bold uppercase tracking-wide text-muted">
        El Mundial empieza en
      </p>
      <div className="mt-3 flex items-start justify-center gap-2">
        {UNITS.map((u, i) => (
          <Fragment key={u.key}>
            {i > 0 && <span className="font-mono text-3xl font-black leading-none text-muted">:</span>}
            <div className="flex flex-col items-center">
              <span className="font-mono text-3xl font-black leading-none text-ink">{pad(c[u.key])}</span>
              <span className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted">{u.label}</span>
            </div>
          </Fragment>
        ))}
      </div>
    </Card>
  )
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
