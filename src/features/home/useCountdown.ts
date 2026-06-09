import { useEffect, useState } from 'react'
import { splitDuration, type Duration } from './format'

export interface Countdown extends Duration {
  done: boolean
}

// Cuenta regresiva en vivo hacia un instante ISO. Tick de 1s; se limpia al desmontar.
export function useCountdown(targetIso: string): Countdown {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const ms = Date.parse(targetIso) - now
  return { ...splitDuration(ms), done: ms <= 0 }
}
