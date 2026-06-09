import { describe, it, expect } from 'vitest'
import { signed } from './format'

describe('signed', () => {
  it('prefija + a positivos y 0', () => {
    expect(signed(360)).toBe('+360')
    expect(signed(0)).toBe('+0')
  })
  it('deja el negativo tal cual', () => {
    expect(signed(-3)).toBe('-3')
  })
})
