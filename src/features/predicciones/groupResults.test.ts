import { describe, it, expect } from 'vitest'
import { rankingsWithResult, positionResult, exactPointValue, realTable } from './groupResults'
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

describe('exactPointValue', () => {
  const pts = (exact: number) => ({ pts_group_position_exact: exact, pts_group_position_partial: 0, bonus_group_complete: 20, total: exact + 20 })
  const withResult = (r: 'exact' | 'partial' | null): GroupRanking => ({ ...ranking('t', 1), result: r })

  it('deriva el valor unitario de pts_group_position_exact / #exactos', () => {
    // 3 exactos que sumaron 15 → 5 c/u
    const groups = [{ rankings: [withResult('exact'), withResult('exact'), withResult('exact'), withResult('partial')], pointsEarned: pts(15) }]
    expect(exactPointValue(groups)).toBe(5)
  })
  it('usa el primer grupo con puntos y exactos (ignora los que aún no suman)', () => {
    const groups = [
      { rankings: [withResult(null)], pointsEarned: null },
      { rankings: [withResult('exact'), withResult('exact')], pointsEarned: pts(10) },
    ]
    expect(exactPointValue(groups)).toBe(5)
  })
  it('null cuando ningún grupo tiene puntos y exactos', () => {
    expect(exactPointValue([{ rankings: [withResult(null)], pointsEarned: null }])).toBeNull()
  })
})

describe('realTable', () => {
  it('arma las filas ordenadas por posición real; null si no hay tabla', () => {
    const group: Group = { id: 'g', label: 'A', name: 'Grupo A', teams: [team('A2', 2), team('A1', 1), team('A3', null)] }
    const rows = realTable(group)!
    expect(rows.map((r) => r.code)).toEqual(['A1', 'A2']) // A3 sin standing queda fuera, orden por realPosition
    expect(realTable({ ...group, teams: group.teams.map((t) => ({ ...t, standing: null })) })).toBeNull()
  })
})
