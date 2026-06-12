import { describe, it, expect, afterEach } from 'vitest'
import { now, setNow, resetClock, todayBogota } from './clock'

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

describe('todayBogota', () => {
  it('devuelve la fecha calendario de Colombia, no la UTC', () => {
    setNow('2026-06-13T02:00:00.000Z') // 9:00 p. m. del 12-jun en Bogotá
    expect(todayBogota()).toBe('2026-06-12')
  })
  it('cambia de día a las 05:00Z (medianoche Colombia)', () => {
    setNow('2026-06-13T05:00:00.000Z')
    expect(todayBogota()).toBe('2026-06-13')
  })
})
