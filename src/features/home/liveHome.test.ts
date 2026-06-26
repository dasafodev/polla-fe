import { describe, it, expect } from 'vitest'
import { deriveLiveHome } from './liveHome'
import type { KoMatch, KoMatchesResponse, ScoreboardEntry } from '../../types/api'

function entry(id: string, rank: number, total: number, prize: number | null = null): ScoreboardEntry {
  return { rank, participant: { id, name: id }, total, prize }
}

function team(id: string, code: string) {
  return { id, name: id, code, flag: null }
}

function match(p: Partial<KoMatch> = {}): KoMatch {
  return {
    id: 'm1',
    externalMatchId: 1,
    matchNumber: 1,
    scheduledAt: '2026-06-28T16:00:00Z',
    lockedAt: '2026-06-28T15:30:00Z',
    status: 'scheduled',
    locked: false,
    homeTeam: team('col', 'COL'),
    awayTeam: team('bra', 'BRA'),
    homeTeamLabel: null,
    awayTeamLabel: null,
    result: null,
    myPrediction: null,
    ...p,
  }
}

function round(slug: KoMatchesResponse['round']['slug'], name: string, order: number, matches: KoMatch[]): KoMatchesResponse {
  return { round: { slug, name, order }, matches }
}

const base = { myId: 'me', scoreboard: [] as ScoreboardEntry[], rounds: [] as KoMatchesResponse[], loading: false }

describe('deriveLiveHome · posición', () => {
  it('calcula gap al líder y gap al podio cuando estoy fuera del podio', () => {
    const board = [entry('a', 1, 145, 700000), entry('b', 2, 132, 250000), entry('c', 3, 118, 50000), entry('me', 4, 98)]
    const s = deriveLiveHome({ ...base, scoreboard: board })
    expect(s.position).toEqual({
      rank: 4,
      total: 98,
      totalParticipants: 4,
      leaderGap: 47,
      podiumGap: 20,
      hasScores: true,
      prize: null,
    })
  })

  it('líder: gap 0 y sin gap al podio', () => {
    const board = [entry('me', 1, 145, 700000), entry('b', 2, 132)]
    const s = deriveLiveHome({ ...base, scoreboard: board })
    expect(s.position?.leaderGap).toBe(0)
    expect(s.position?.podiumGap).toBe(null)
  })

  it('todos en cero → hasScores false y gaps en cero', () => {
    const board = [entry('a', 1, 0), entry('me', 2, 0)]
    const s = deriveLiveHome({ ...base, scoreboard: board })
    expect(s.position?.hasScores).toBe(false)
    expect(s.position?.leaderGap).toBe(0)
  })

  it('si no estoy en la tabla → null', () => {
    const s = deriveLiveHome({ ...base, scoreboard: [entry('a', 1, 10)] })
    expect(s.position).toBe(null)
  })
})

describe('deriveLiveHome · KO pendientes', () => {
  it('elige la ronda de menor order con pendientes, cuenta y toma el cierre más próximo', () => {
    const rounds = [
      round('r16', 'Octavos', 2, [
        match({ id: 'a', lockedAt: '2026-07-01T10:00:00Z' }),
        match({ id: 'b', lockedAt: '2026-07-01T08:00:00Z' }),
      ]),
      round('r32', 'Dieciseisavos', 1, [match({ id: 'c', myPrediction: { scoreHome: 1, scoreAway: 0, teamAdvancesId: 'col', tripleActive: false, lockedIn: false, pointsEarned: null } })]),
    ]
    // r32 ya está pronosticado → la ronda abierta es r16
    const s = deriveLiveHome({ ...base, rounds })
    expect(s.pendingKo).toEqual({ count: 2, roundName: 'Octavos', deadline: '2026-07-01T08:00:00Z' })
  })

  it('ignora bloqueados, ya pronosticados y con equipos TBD', () => {
    const rounds = [
      round('r32', 'Dieciseisavos', 1, [
        match({ id: 'locked', locked: true }),
        match({ id: 'tbd', homeTeam: null }),
      ]),
    ]
    expect(deriveLiveHome({ ...base, rounds }).pendingKo).toBe(null)
  })
})
