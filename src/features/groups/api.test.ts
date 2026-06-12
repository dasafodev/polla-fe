import { describe, it, expect } from 'vitest'
import { adaptMyGroupPredictions, adaptFriendsGroups, adaptGroupMatch } from './api'

// Forma cruda del backend real: predictedPosition (no position), sin pts_group_position_partial.
// `flag` se conserva (puede ser null); `totalGroupPoints` se ignora.
const rawGroupPrediction = {
  groupId: 'g-A',
  label: 'A',
  name: 'Grupo A',
  groupComplete: true,
  rankings: [
    { teamId: 'tA1', name: 'Equipo A1', code: 'A1', isTop8: true, predictedPosition: 1, flag: '🇦🇷' },
    { teamId: 'tA2', name: 'Equipo A2', code: 'A2', isTop8: false, predictedPosition: 2, flag: null },
  ],
  pointsEarned: { pts_group_position_exact: 5, bonus_group_complete: 20, total: 25 },
  totalGroupPoints: 25,
}

describe('adaptMyGroupPredictions', () => {
  it('mapea predictedPosition → position', () => {
    const out = adaptMyGroupPredictions({ data: [rawGroupPrediction], completedGroups: 1 })
    expect(out.data[0].rankings[0].position).toBe(1)
    expect(out.data[0].rankings[1].position).toBe(2)
  })
  it('conserva flag (incluido null)', () => {
    const out = adaptMyGroupPredictions({ data: [rawGroupPrediction], completedGroups: 1 })
    expect(out.data[0].rankings[0].flag).toBe('🇦🇷')
    expect(out.data[0].rankings[1].flag).toBeNull()
  })
  it('rellena pts_group_position_partial ausente con 0', () => {
    const out = adaptMyGroupPredictions({ data: [rawGroupPrediction], completedGroups: 1 })
    expect(out.data[0].pointsEarned?.pts_group_position_partial).toBe(0)
    expect(out.data[0].pointsEarned?.pts_group_position_exact).toBe(5)
  })
  it('conserva pointsEarned null', () => {
    const out = adaptMyGroupPredictions({ data: [{ ...rawGroupPrediction, pointsEarned: null }], completedGroups: 0 })
    expect(out.data[0].pointsEarned).toBeNull()
  })
  it('preserva completedGroups', () => {
    expect(adaptMyGroupPredictions({ data: [], completedGroups: 7 }).completedGroups).toBe(7)
  })
  it('mapea positionStats.pct → consensusPct', () => {
    const raw = {
      ...rawGroupPrediction,
      rankings: [
        { teamId: 'tA1', name: 'Equipo A1', code: 'A1', isTop8: true, predictedPosition: 1, flag: '🇦🇷', positionStats: { pct: 78.5 } },
        { teamId: 'tA2', name: 'Equipo A2', code: 'A2', isTop8: false, predictedPosition: 2, flag: null },
      ],
    }
    const out = adaptMyGroupPredictions({ data: [raw], completedGroups: 1 })
    expect(out.data[0].rankings[0].consensusPct).toBe(78.5)
  })
  it('consensusPct es null cuando no hay positionStats', () => {
    const out = adaptMyGroupPredictions({ data: [rawGroupPrediction], completedGroups: 1 })
    expect(out.data[0].rankings[0].consensusPct).toBeNull()
  })
})

describe('adaptFriendsGroups', () => {
  it('mapea las predicciones de cada amigo (predictedPosition → position)', () => {
    const out = adaptFriendsGroups({
      available: true,
      data: [{ participant: { id: 'p2', name: 'María' }, predictions: [rawGroupPrediction] }],
    })
    expect(out.available).toBe(true)
    expect(out.data?.[0].predictions[0].rankings[0].position).toBe(1)
  })
  it('rama no disponible: conserva availableAt y data ausente', () => {
    const out = adaptFriendsGroups({ available: false, availableAt: '2026-06-11T16:00:00.000Z' })
    expect(out.available).toBe(false)
    expect(out.availableAt).toBe('2026-06-11T16:00:00.000Z')
  })
})

describe('adaptGroupMatch', () => {
  const raw = {
    id: 'gm-1', matchNumber: 1, groupId: 'g-A', groupLabel: 'A',
    scheduledAt: '2026-06-12T16:00:00.000Z', status: 'LIVE',
    homeTeam: { id: 'tA1', name: 'Equipo A1', code: 'A1', flag: null },
    awayTeam: { id: 'tA2', name: 'Equipo A2', code: 'A2', flag: null },
    homeTeamLabel: 'Equipo A1', awayTeamLabel: 'Equipo A2',
    scoreHome: 1, scoreAway: 0,
  }
  it('baja el status del backend a minúsculas (LIVE → live)', () => {
    expect(adaptGroupMatch(raw).status).toBe('live')
  })
  it('conserva marcador, grupo y equipos', () => {
    const out = adaptGroupMatch(raw)
    expect(out.scoreHome).toBe(1)
    expect(out.groupLabel).toBe('A')
    expect(out.homeTeam?.code).toBe('A1')
  })
})
