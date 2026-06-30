import { describe, it, expect, beforeEach } from 'vitest'
import { db, type DbKoMatch, type DbKoPrediction } from './db'
import { resetDb } from './seed'
import { computeScoreboard, computeBreakdown, countKoExact, koPointsFor, computeKoPoints, topScoreboard } from './scoring'
import { ROUND_SLUGS, ROUND_TO_SCALE } from '../types/enums'
import type { ScoreboardEntry } from '../types/api'

beforeEach(() => resetDb())

describe('computeScoreboard', () => {
  it('ordena por total desc y asigna premios 700k/250k/50k, null del 4º en adelante', () => {
    const sb = computeScoreboard(db)
    expect(sb.map((e) => e.total)).toEqual([...sb.map((e) => e.total)].sort((a, b) => b - a))
    expect(sb[0].rank).toBe(1)
    expect([sb[0].prize, sb[1].prize, sb[2].prize]).toEqual([700_000, 250_000, 50_000])
    if (sb.length > 3) expect(sb[3].prize).toBeNull()
  })

  it('excluye al admin (D5)', () => {
    expect(computeScoreboard(db).some((e) => e.participant.id === 'p-admin')).toBe(false)
  })

  it('rompe empate de total por mayor # de exactos KO (RF-40)', () => {
    expect(computeBreakdown(db, 'p-juan').total).toBe(computeBreakdown(db, 'p-maria').total)
    expect(countKoExact(db, 'p-juan')).toBeGreaterThan(countKoExact(db, 'p-maria'))
    const sb = computeScoreboard(db)
    const iJuan = sb.findIndex((e) => e.participant.id === 'p-juan')
    const iMaria = sb.findIndex((e) => e.participant.id === 'p-maria')
    expect(iJuan).toBeLessThan(iMaria)
  })

  it('empate pleno (pts Y exactos KO) → comparten rank y el siguiente salta, como el BE (1,1,3)', () => {
    // María copia las predicciones KO de Juan → mismo total y mismos exactos
    const deJuan = db.koPredictions.filter((p) => p.participantId === 'p-juan')
    db.koPredictions = [
      ...db.koPredictions.filter((p) => p.participantId !== 'p-maria'),
      ...deJuan.map((p) => ({ ...p, participantId: 'p-maria' })),
    ]
    const sb = computeScoreboard(db)
    expect(sb[0].rank).toBe(1)
    expect(sb[1].rank).toBe(1)
    expect(sb[2].rank).toBe(3)
    expect(sb[3].rank).toBe(4)
  })
})

describe('topScoreboard (top-N + usuario fuera del top)', () => {
  const entry = (rank: number, id: string): ScoreboardEntry => ({ rank, participant: { id, name: id }, total: 100 - rank, prize: null })
  const list = Array.from({ length: 12 }, (_, i) => entry(i + 1, `p-${i + 1}`))

  it('devuelve la lista tal cual cuando no supera el límite', () => {
    const short = list.slice(0, 8)
    expect(topScoreboard(short, 'p-3', 10)).toEqual(short)
  })

  it('recorta al top N sin anexar cuando el usuario está dentro del top', () => {
    expect(topScoreboard(list, 'p-3', 10)).toEqual(list.slice(0, 10))
  })

  it('anexa al usuario con su posición real cuando está fuera del top', () => {
    const res = topScoreboard(list, 'p-12', 10)
    expect(res).toHaveLength(11)
    expect(res.slice(0, 10)).toEqual(list.slice(0, 10))
    expect(res[10]).toEqual(list[11]) // p-12 con su rank 12 real
  })

  it('no anexa nada cuando currentId es null o no aparece en la lista (p. ej. admin)', () => {
    expect(topScoreboard(list, null, 10)).toEqual(list.slice(0, 10))
    expect(topScoreboard(list, 'p-admin', 10)).toEqual(list.slice(0, 10))
  })
})

describe('coherencia scoreboard ↔ breakdown', () => {
  it('mismo total en ambas vistas', () => {
    for (const e of computeScoreboard(db)) expect(computeBreakdown(db, e.participant.id).total).toBe(e.total)
  })
  it('breakdown suma sus 5 dominios; disappointment ≤ 0, darkHorse ≥ 0', () => {
    const { breakdown, total } = computeBreakdown(db, 'p-juan')
    const { groups, thirds, ko, darkHorse, disappointment } = breakdown
    expect(disappointment).toBeLessThanOrEqual(0)
    expect(darkHorse).toBeGreaterThanOrEqual(0)
    expect(total).toBe(groups + thirds + ko + darkHorse + disappointment)
  })
})

describe('koPointsFor — null vs no-null', () => {
  it('no-null y escalado por ronda en partido finished con marcador exacto (r32)', () => {
    const pe = koPointsFor(db, 'p-juan', 'ko-r32-1')!
    expect(pe.scale_slug).toBe('scale_r32')
    expect(pe.pts_ko_advances).toBe(db.scoringParams.pts_ko_advances)
    expect(pe.pts_ko_exact_score).toBe(db.scoringParams.pts_ko_exact_score)
    expect(pe.total).toBe(pe.pts_ko_advances + pe.pts_ko_exact_score + pe.mult_triple)
  })
  it('null si el participante no predijo ese partido', () => {
    expect(koPointsFor(db, 'p-luis', 'ko-r32-1')).toBeNull()
  })
})

describe('tripleUsesRemaining (derivado, clamp 0..3)', () => {
  it('pedro tiene 3 triples activos → remaining 0', () => {
    expect(computeBreakdown(db, 'p-pedro').tripleUsesRemaining).toBe(0)
  })
})

describe('ROUND_TO_SCALE — cubre todas las rondas KO (incl. qf/sf/3rd/final que el seed no ejercita)', () => {
  it('cada ronda mapea a su escala (3rd reusa scale_sf) y aplica el factor correcto', () => {
    for (const slug of ROUND_SLUGS) {
      const match: DbKoMatch = {
        id: 'x', roundSlug: slug, externalMatchId: 1, matchNumber: 1,
        scheduledAt: '2026-07-01T00:00:00.000Z', lockedAt: '2026-07-01T00:00:00.000Z', status: 'finished',
        homeTeamId: 'tA1', awayTeamId: 'tB1', homeTeamLabel: null, awayTeamLabel: null,
        homeSource: null, awaySource: null,
        result: { scoreHome: 1, scoreAway: 0, winnerTeamId: 'tA1' },
      }
      const pred: DbKoPrediction = { participantId: 'p', matchId: 'x', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tA1', tripleActive: false }
      const pe = computeKoPoints(match, pred, db.scoringParams)!
      expect(pe.scale_slug).toBe(ROUND_TO_SCALE[slug])
      expect(pe.scale_factor).toBe(db.scoringParams[ROUND_TO_SCALE[slug]])
      expect(pe.total).toBe((db.scoringParams.pts_ko_advances + db.scoringParams.pts_ko_exact_score) * pe.scale_factor)
    }
  })
})
