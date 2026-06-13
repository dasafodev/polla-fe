import { describe, it, expect } from 'vitest'
import { rankingsWithResult, positionResult } from './groupResults'
import type { Group, GroupRanking } from '../../types/api'

const ranking = (teamId: string, position: number): GroupRanking => ({
  teamId, name: teamId, code: teamId, isTop8: false, flag: null, position, result: null, consensusPct: null,
})
const team = (id: string, realPosition: number | null) => ({
  id, name: id, code: id, isTop8: false, flag: null,
  standing: realPosition == null ? null : { realPosition, pts: 0, matchesPlayed: 1, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 },
})

describe('positionResult', () => {
  it('exact cuando la real coincide con la predicha', () => expect(positionResult(3, 3)).toBe('exact'))
  it('partial cuando difieren', () => expect(positionResult(1, 2)).toBe('partial'))
  it('null cuando el equipo aún no tiene posición real', () => expect(positionResult(1, undefined)).toBeNull())
})

describe('rankingsWithResult', () => {
  // Caso real del bug (screenshot): predije KOR-1, MEX-2, CZE-3, RSA-4; la tabla va MEX-1, KOR-2, CZE-3, RSA-4.
  const group: Group = {
    id: 'g-A', label: 'A', name: 'Grupo A',
    teams: [team('MEX', 1), team('KOR', 2), team('CZE', 3), team('RSA', 4)],
  }
  const rankings = [ranking('KOR', 1), ranking('MEX', 2), ranking('CZE', 3), ranking('RSA', 4)]

  it('marca exact los aciertos (CZE, RSA) y partial los demás', () => {
    expect(rankingsWithResult(rankings, group).map((r) => r.result)).toEqual(['partial', 'partial', 'exact', 'exact'])
  })
  it('grupo sin tabla → todo null', () => {
    const sinTabla: Group = { ...group, teams: group.teams.map((t) => ({ ...t, standing: null })) }
    expect(rankingsWithResult(rankings, sinTabla).every((r) => r.result === null)).toBe(true)
  })
  it('grupo ausente → todo null', () => {
    expect(rankingsWithResult(rankings, undefined).every((r) => r.result === null)).toBe(true)
  })
})
