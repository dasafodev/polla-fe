import { useEffect, useState, type ReactNode } from 'react'
import { useReduced } from './motion'

export function ProgressRing({
  percent,
  size = 160,
  stroke = 14,
  children,
}: {
  percent: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const reduced = useReduced()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [shown, setShown] = useState(reduced ? percent : 0)

  useEffect(() => {
    if (reduced) {
      setShown(percent)
      return
    }
    let raf = 0
    const start = performance.now()
    const dur = 900
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(percent * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [percent, reduced])

  const offset = c - (shown / 100) * c
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-violet-light)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? <span className="font-mono text-3xl font-bold">{shown}%</span>}
      </div>
    </div>
  )
}
