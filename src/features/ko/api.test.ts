import { describe, it, expect } from 'vitest'
import { adaptKoMatchesResponse, adaptKoMatch } from './api'

const rawMatch = {
  id: 'ko-r32-1',
  externalMatchId: null, // el backend puede devolver null
  matchNumber: 1,
  scheduledAt: '2026-06-29T16:00:00.000Z',
  lockedAt: '2026-06-29T15:30:00.000Z',
  status: 'SCHEDULED', // enum Prisma en MAYÚSCULAS
  locked: false,
  homeTeam: { id: 'tA1', name: 'Equipo A1', code: 'A1', flag: '🇦🇷' },
  awayTeam: null,
  homeTeamLabel: null,
  awayTeamLabel: 'Pos 2',
  result: null,
  myPrediction: null,
}

describe('adaptKoMatch', () => {
  it('baja el status a minúsculas', () => {
    expect(adaptKoMatch({ ...rawMatch, status: 'FINISHED' }).status).toBe('finished')
    expect(adaptKoMatch(rawMatch).status).toBe('scheduled')
  })
  it('coacciona externalMatchId null → 0', () => {
    expect(adaptKoMatch(rawMatch).externalMatchId).toBe(0)
  })
})

describe('adaptKoMatchesResponse', () => {
  it('baja el slug de ronda a la forma del FE (R32 → r32)', () => {
    const out = adaptKoMatchesResponse({ round: { slug: 'R32', name: 'Dieciseisavos', order: 1 }, matches: [rawMatch] })
    expect(out.round.slug).toBe('r32')
    expect(out.matches[0].status).toBe('scheduled')
  })
  it('mapea THIRD → 3rd', () => {
    const out = adaptKoMatchesResponse({ round: { slug: 'THIRD', name: 'Tercer puesto', order: 5 }, matches: [] })
    expect(out.round.slug).toBe('3rd')
  })
})
