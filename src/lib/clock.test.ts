import { describe, it, expect, afterEach } from 'vitest'
import { now, setNow, resetClock } from './clock'

afterEach(() => resetClock())

describe('clock', () => {
  it('por defecto retorna la hora real (epoch ms > 0)', () => {
    expect(now()).toBeGreaterThan(0)
  })
  it('setNow fija un instante simulado en epoch ms', () => {
    setNow('2026-06-11T17:00:00.000Z')
    expect(now()).toBe(Date.parse('2026-06-11T17:00:00.000Z'))
  })
  it('resetClock vuelve a hora real', () => {
    setNow('2026-06-11T17:00:00.000Z')
    resetClock()
    expect(Math.abs(now() - Date.now())).toBeLessThan(1000)
  })
  it('setNow rechaza un ISO inválido (no deja now()=NaN, que desactivaría los candados)', () => {
    expect(() => setNow('no-es-fecha')).toThrow()
    expect(Number.isNaN(now())).toBe(false)
  })
})
