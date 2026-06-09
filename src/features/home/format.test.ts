import { describe, it, expect } from 'vitest'
import { splitDuration } from './format'

describe('splitDuration', () => {
  it('descompone días/horas/minutos/segundos', () => {
    const ms = ((1 * 24 + 18) * 3600 + 42 * 60 + 9) * 1000
    expect(splitDuration(ms)).toEqual({ days: 1, hours: 18, minutes: 42, seconds: 9 })
  })

  it('negativo → todo en cero', () => {
    expect(splitDuration(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  })

  it('menos de un minuto', () => {
    expect(splitDuration(45_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 45 })
  })
})
