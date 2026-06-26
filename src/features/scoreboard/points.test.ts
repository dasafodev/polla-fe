import { describe, it, expect } from 'vitest'
import { pointsFor } from './points'
import type { ScoreboardEntry } from '../../types/api'

const entry: ScoreboardEntry = {
  rank: 1, participant: { id: 'p1', name: 'Ana' },
  total: 145, realTotal: 40, simulatedTotal: 105, prize: null,
}

describe('pointsFor', () => {
  it('provisionales = total (proyección completa)', () => {
    expect(pointsFor(entry, 'provisional')).toBe(145)
  })

  it('oficiales = realTotal del backend (lo confirmado), no 0', () => {
    expect(pointsFor(entry, 'official')).toBe(40)
  })

  it('oficiales cae a 0 si el backend no envía realTotal', () => {
    expect(pointsFor({ ...entry, realTotal: undefined }, 'official')).toBe(0)
  })
})
