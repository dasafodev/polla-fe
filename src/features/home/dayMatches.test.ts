import { describe, it, expect } from 'vitest'
import { deriveDayMatches } from './dayMatches'
import type { GroupMatch, KoMatch } from '../../types/api'

function gm(p: Partial<GroupMatch> & { id: string }): GroupMatch {
  return {
    matchNumber: 1, groupId: 'g-A', groupLabel: 'A',
    scheduledAt: '2026-06-12T16:00:00.000Z', status: 'scheduled',
    homeTeam: { id: 'h', name: 'Home', code: 'HOM', flag: null },
    awayTeam: { id: 'a', name: 'Away', code: 'AWA', flag: null },
    homeTeamLabel: null, awayTeamLabel: null, scoreHome: null, scoreAway: null,
    ...p,
  }
}

function ko(p: Partial<KoMatch> & { id: string }): KoMatch {
  return {
    externalMatchId: 1, matchNumber: 1,
    scheduledAt: '2026-06-12T16:00:00.000Z', lockedAt: '2026-06-12T15:30:00.000Z',
    status: 'scheduled', locked: false,
    homeTeam: { id: 'h', name: 'Home', code: 'HOM', flag: null },
    awayTeam: { id: 'a', name: 'Away', code: 'AWA', flag: null },
    homeTeamLabel: null, awayTeamLabel: null, homeSource: null, awaySource: null, result: null, myPrediction: null,
    ...p,
  }
}

const TODAY = '2026-06-12'
const NOW = Date.parse('2026-06-12T12:00:00.000Z')

describe('deriveDayMatches', () => {
  it('lista TODOS los partidos de hoy (grupos + KO) ordenados por hora', () => {
    const group = [
      gm({ id: 'g-late', scheduledAt: '2026-06-12T20:00:00.000Z' }),
      gm({ id: 'g-early', scheduledAt: '2026-06-12T16:00:00.000Z' }),
      gm({ id: 'g-otherDay', scheduledAt: '2026-06-13T16:00:00.000Z' }),
    ]
    const koM = [ko({ id: 'k-mid', scheduledAt: '2026-06-12T18:00:00.000Z' })]
    const r = deriveDayMatches({ groupMatches: group, koMatches: koM, today: TODAY, now: NOW })
    expect(r.mode).toBe('today')
    expect(r.matches.map((m) => m.id)).toEqual(['g-early', 'k-mid', 'g-late'])
  })

  it('incluye un partido cuyo UTC cae hoy en Bogotá (cruce de medianoche)', () => {
    // 13-jun 00:30Z = 12-jun 19:30 en Bogotá
    const group = [gm({ id: 'g-night', scheduledAt: '2026-06-13T00:30:00.000Z' })]
    const r = deriveDayMatches({ groupMatches: group, koMatches: [], today: TODAY, now: NOW })
    expect(r.matches.map((m) => m.id)).toEqual(['g-night'])
  })

  it('kicker según el estado en modo "hoy"', () => {
    const group = [
      gm({ id: 'g-live', status: 'live', scheduledAt: '2026-06-12T16:00:00.000Z' }),
      gm({ id: 'g-done', status: 'finished', scheduledAt: '2026-06-12T14:00:00.000Z' }),
      gm({ id: 'g-todo', status: 'scheduled', scheduledAt: '2026-06-12T20:00:00.000Z' }),
    ]
    const r = deriveDayMatches({ groupMatches: group, koMatches: [], today: TODAY, now: NOW })
    const kicker = Object.fromEntries(r.matches.map((m) => [m.id, m.kicker]))
    expect(kicker['g-live']).toBe('En juego ahora')
    expect(kicker['g-done']).toBe('Finalizado')
    expect(kicker['g-todo']).toBe('Por jugar')
  })

  it('sin partidos hoy → cae al próximo partido programado (fallback)', () => {
    const group = [
      gm({ id: 'g-far', scheduledAt: '2026-06-25T16:00:00.000Z' }),
      gm({ id: 'g-future', scheduledAt: '2026-06-20T16:00:00.000Z' }),
      gm({ id: 'g-past', status: 'finished', scheduledAt: '2026-06-01T16:00:00.000Z' }),
    ]
    const r = deriveDayMatches({ groupMatches: group, koMatches: [], today: TODAY, now: NOW })
    expect(r.mode).toBe('next')
    expect(r.matches.map((m) => m.id)).toEqual(['g-future'])
    expect(r.matches[0].kicker).toBe('Siguiente partido')
  })

  it('excluye partidos KO sin equipos definidos (TBD)', () => {
    const koM = [ko({ id: 'k-tbd', homeTeam: null, awayTeam: null, homeTeamLabel: 'Pos 1', awayTeamLabel: 'Pos 2' })]
    const r = deriveDayMatches({ groupMatches: [], koMatches: koM, today: TODAY, now: NOW })
    expect(r.matches).toHaveLength(0)
  })

  it('sin partidos en absoluto → vacío', () => {
    const r = deriveDayMatches({ groupMatches: [], koMatches: [], today: TODAY, now: NOW })
    expect(r.matches).toHaveLength(0)
  })
})
