import { describe, it, expect } from 'vitest'
import { officialPoints } from './points'
import type { ScoreboardEntry } from '../../types/api'

const entry: ScoreboardEntry = {
  rank: 1, participant: { id: 'p1', name: 'Ana' },
  total: 145, realTotal: 40, simulatedTotal: 105, prize: null,
}

describe('officialPoints', () => {
  it('usa realTotal del backend (lo confirmado), nunca la proyección provisional', () => {
    expect(officialPoints(entry)).toBe(40)
  })

  it('cae a 0 si el backend no envía realTotal', () => {
    expect(officialPoints({ ...entry, realTotal: undefined })).toBe(0)
  })
})
