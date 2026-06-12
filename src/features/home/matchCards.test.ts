import { describe, it, expect } from 'vitest'
import { deriveMatchCards } from './matchCards'
import type { GroupMatch } from '../../types/api'

function gm(p: Partial<GroupMatch> & { id: string }): GroupMatch {
  return {
    matchNumber: 1, groupId: 'g-A', groupLabel: 'A',
    scheduledAt: '2026-06-12T16:00:00.000Z', status: 'scheduled',
    homeTeam: { id: 't1', name: 'Equipo 1', code: 'T1', flag: null },
    awayTeam: { id: 't2', name: 'Equipo 2', code: 'T2', flag: null },
    homeTeamLabel: 'Equipo 1', awayTeamLabel: 'Equipo 2',
    scoreHome: null, scoreAway: null,
    ...p,
  }
}

describe('deriveMatchCards', () => {
  it('un partido EN VIVO es el actual, aunque haya programados más próximos', () => {
    const { current } = deriveMatchCards([
      gm({ id: 'sched', status: 'scheduled', scheduledAt: '2026-06-12T18:00:00.000Z' }),
      gm({ id: 'live', status: 'live', scheduledAt: '2026-06-12T20:00:00.000Z', scoreHome: 1, scoreAway: 1 }),
    ])
    expect(current?.id).toBe('live')
  })

  it('sin partidos en vivo, el actual es el programado más próximo', () => {
    const { current } = deriveMatchCards([
      gm({ id: 'late', status: 'scheduled', scheduledAt: '2026-06-13T16:00:00.000Z' }),
      gm({ id: 'early', status: 'scheduled', scheduledAt: '2026-06-12T18:00:00.000Z' }),
    ])
    expect(current?.id).toBe('early')
  })

  it('el anterior es el último terminado por hora de inicio', () => {
    const { previous } = deriveMatchCards([
      gm({ id: 'f1', status: 'finished', scheduledAt: '2026-06-11T16:00:00.000Z', scoreHome: 3, scoreAway: 0 }),
      gm({ id: 'f2', status: 'finished', scheduledAt: '2026-06-12T16:00:00.000Z', scoreHome: 2, scoreAway: 1 }),
    ])
    expect(previous?.id).toBe('f2')
  })

  it('sin partidos → ambos null', () => {
    expect(deriveMatchCards([])).toEqual({ current: null, previous: null })
  })
})
