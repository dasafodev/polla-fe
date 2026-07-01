import { describe, it, expect } from 'vitest'
import { deriveColombiaTakeover } from './colombiaTakeover'
import { ROUND_LONG } from '../../ko/koView'
import type { KoMatch, KoMatchesResponse, KoTeam } from '../../../types/api'
import type { RoundSlug } from '../../../types/enums'

const COL: KoTeam = { id: 'col', name: 'Colombia', code: 'COL', flag: 'co.png' }
const BRA: KoTeam = { id: 'bra', name: 'Brasil', code: 'BRA', flag: 'br.png' }
const ARG: KoTeam = { id: 'arg', name: 'Argentina', code: 'ARG', flag: null }
const MEX: KoTeam = { id: 'mex', name: 'México', code: 'MEX', flag: null }

const TODAY = '2026-07-01'
const KICK = '2026-07-01T23:00:00.000Z' // Bogotá 18:00 del 2026-07-01
const OTHER_DAY = '2026-07-05T23:00:00.000Z'

function ko(p: Partial<KoMatch> & { id: string }): KoMatch {
  return {
    externalMatchId: 1, matchNumber: 1,
    scheduledAt: KICK, lockedAt: '2026-07-01T22:00:00.000Z',
    status: 'scheduled', locked: false,
    homeTeam: COL, awayTeam: BRA,
    homeTeamLabel: null, awayTeamLabel: null, homeSource: null, awaySource: null,
    result: null, myPrediction: null,
    ...p,
  }
}

function round(slug: RoundSlug, matches: KoMatch[]): KoMatchesResponse {
  return { round: { slug, name: ROUND_LONG[slug], order: 0 }, matches }
}

describe('deriveColombiaTakeover', () => {
  it('sin partido de Colombia hoy → null', () => {
    const rounds = [round('qf', [ko({ id: 'm1', homeTeam: ARG, awayTeam: MEX })])]
    expect(deriveColombiaTakeover({ rounds, today: TODAY })).toBeNull()
  })

  it('Colombia juega pero no hoy → null', () => {
    const rounds = [round('qf', [ko({ id: 'm1', scheduledAt: OTHER_DAY })])]
    expect(deriveColombiaTakeover({ rounds, today: TODAY })).toBeNull()
  })

  it('partido hoy programado → fase countdown, con rival, ronda y kickoff', () => {
    const rounds = [round('qf', [ko({ id: 'm1' })])]
    const t = deriveColombiaTakeover({ rounds, today: TODAY })!
    expect(t.phase).toBe('countdown')
    expect(t.colombia.code).toBe('COL')
    expect(t.opponent.code).toBe('BRA')
    expect(t.roundLong).toBe('Cuartos')
    expect(t.kickoffAt).toBe(KICK)
    expect(t.score).toBeNull()
  })

  it('en vivo con marcador → fase live y score orientado a Colombia', () => {
    const rounds = [round('qf', [ko({ id: 'm1', status: 'live', result: { scoreHome: 1, scoreAway: 0, winnerTeamId: '' } })])]
    const t = deriveColombiaTakeover({ rounds, today: TODAY })!
    expect(t.phase).toBe('live')
    expect(t.score).toEqual({ col: 1, opp: 0 })
  })

  it('en vivo sin marcador aún → fase live, score null', () => {
    const rounds = [round('qf', [ko({ id: 'm1', status: 'live', result: null })])]
    const t = deriveColombiaTakeover({ rounds, today: TODAY })!
    expect(t.phase).toBe('live')
    expect(t.score).toBeNull()
  })

  it('finalizado y Colombia gana → fase won con marcador', () => {
    const rounds = [round('qf', [ko({ id: 'm1', status: 'finished', result: { scoreHome: 2, scoreAway: 1, winnerTeamId: COL.id } })])]
    const t = deriveColombiaTakeover({ rounds, today: TODAY })!
    expect(t.phase).toBe('won')
    expect(t.score).toEqual({ col: 2, opp: 1 })
  })

  it('finalizado y Colombia pierde → null (home normal)', () => {
    const rounds = [round('qf', [ko({ id: 'm1', status: 'finished', result: { scoreHome: 0, scoreAway: 2, winnerTeamId: BRA.id } })])]
    expect(deriveColombiaTakeover({ rounds, today: TODAY })).toBeNull()
  })

  it('Colombia de visitante → colombia/opponent y score correctos', () => {
    const rounds = [round('sf', [ko({ id: 'm1', homeTeam: BRA, awayTeam: COL, status: 'live', result: { scoreHome: 2, scoreAway: 3, winnerTeamId: '' } })])]
    const t = deriveColombiaTakeover({ rounds, today: TODAY })!
    expect(t.colombia.code).toBe('COL')
    expect(t.opponent.code).toBe('BRA')
    expect(t.score).toEqual({ col: 3, opp: 2 })
  })
})
