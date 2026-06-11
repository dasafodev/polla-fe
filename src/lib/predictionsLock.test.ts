import { describe, it, expect } from 'vitest'
import { predictionsLocked } from './predictionsLock'
import { setNow } from './clock'

describe('predictionsLocked', () => {
  it('bloquea cuando el API ya reporta el candado', () => {
    setNow('2026-06-06T12:00:00.000Z') // antes del cierre
    expect(predictionsLocked(true)).toBe(true)
  })

  it('no bloquea antes del cierre si el API dice available:false', () => {
    setNow('2026-06-06T12:00:00.000Z')
    expect(predictionsLocked(false)).toBe(false)
    expect(predictionsLocked(undefined)).toBe(false)
  })

  it('bloquea por fecha aunque el API diga available:false (torneo ya arrancó)', () => {
    setNow('2026-06-12T00:00:00.000Z') // después del cierre
    expect(predictionsLocked(false)).toBe(true)
    expect(predictionsLocked(undefined)).toBe(true)
  })
})
