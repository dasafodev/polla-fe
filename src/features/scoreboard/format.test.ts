import { describe, it, expect } from 'vitest'
import { formatCOP } from './format'

describe('formatCOP', () => {
  it('agrupa miles con puntos y antepone $', () => {
    expect(formatCOP(700000)).toBe('$700.000')
    expect(formatCOP(50000)).toBe('$50.000')
    expect(formatCOP(1000000)).toBe('$1.000.000')
    expect(formatCOP(0)).toBe('$0')
  })
})
