import { setDb, type Db, type DbTeam, type DbGroup, type DbKoMatch } from './db'
import type { ScoringParams } from '../types/enums'

const GROUP_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const
// 8 top8 = el equipo "1" de los primeros 8 grupos
const TOP8 = new Set(['tA1', 'tB1', 'tC1', 'tD1', 'tE1', 'tF1', 'tG1', 'tH1'])

function buildCatalog(): { teams: DbTeam[]; groups: DbGroup[] } {
  const teams: DbTeam[] = []
  const groups: DbGroup[] = []
  for (const L of GROUP_LABELS) {
    const groupId = `g-${L}`
    const teamIds: string[] = []
    for (let i = 1; i <= 4; i++) {
      const id = `t${L}${i}`
      teams.push({ id, name: `Equipo ${L}${i}`, code: `${L}${i}`, isTop8: TOP8.has(id), groupId })
      teamIds.push(id)
    }
    groups.push({ id: groupId, label: L, name: `Grupo ${L}`, teamIds })
  }
  return { teams, groups }
}

// rankings completos [pos1..pos4] = orden natural tX1,tX2,tX3,tX4 del grupo
function completeRankings(participantId: string, groups: DbGroup[]) {
  return groups.map((g) => ({
    participantId, groupId: g.id,
    rankings: g.teamIds.map((teamId, i) => ({ teamId, position: i + 1 })),
  }))
}

const SCORING: ScoringParams = {
  pts_group_position_exact: 5, pts_group_position_partial: 2, bonus_group_complete: 10,
  pts_third_correct: 5, pts_ko_advances: 10, pts_ko_exact_score: 5,
  pts_dark_horse_per_round: 8, pts_disappointment_per_round: 3, mult_triple: 10,
  scale_r32: 1, scale_r16: 2, scale_qf: 3, scale_sf: 4, scale_final: 5,
}

// lockedAt = scheduledAt − 30min
const lock = (iso: string) => new Date(Date.parse(iso) - 30 * 60_000).toISOString()

function buildKoMatches(): DbKoMatch[] {
  const m = (
    id: string, roundSlug: DbKoMatch['roundSlug'], n: number, scheduledAt: string,
    status: DbKoMatch['status'], homeTeamId: string | null, awayTeamId: string | null,
    result: DbKoMatch['result'],
  ): DbKoMatch => ({
    id, roundSlug, externalMatchId: n, matchNumber: n, scheduledAt, lockedAt: lock(scheduledAt),
    status, homeTeamId, awayTeamId, homeTeamLabel: homeTeamId ? null : `Pos ${n}`, awayTeamLabel: awayTeamId ? null : `Pos ${n}b`, result,
  })
  return [
    // finished (desempate): r32-1, r32-2 y r16-1
    m('ko-r32-1', 'r32', 1, '2026-06-29T16:00:00.000Z', 'finished', 'tA1', 'tB1', { scoreHome: 2, scoreAway: 1, winnerTeamId: 'tA1' }),
    m('ko-r32-2', 'r32', 2, '2026-06-29T20:00:00.000Z', 'finished', 'tC1', 'tD1', { scoreHome: 1, scoreAway: 0, winnerTeamId: 'tC1' }),
    // locked sin resultado: lockedAt en el pasado respecto a now de test (2026-06-06) → MATCH_LOCKED sin setNow
    m('ko-r32-locked', 'r32', 3, '2026-06-05T16:00:00.000Z', 'scheduled', 'tE1', 'tF1', null),
    // abiertos (lockedAt futuro): para crear/editar predicciones en tests
    m('ko-r32-open-1', 'r32', 4, '2026-06-29T16:00:00.000Z', 'scheduled', 'tG1', 'tH1', null),
    m('ko-r32-open-2', 'r32', 5, '2026-06-30T16:00:00.000Z', 'scheduled', 'tA2', 'tB2', null),
    m('ko-r32-open-3', 'r32', 6, '2026-07-01T16:00:00.000Z', 'scheduled', 'tC2', 'tD2', null),
    m('ko-r32-open-4', 'r32', 7, '2026-07-02T16:00:00.000Z', 'scheduled', 'tE2', 'tF2', null),
    m('ko-r32-open-5', 'r32', 8, '2026-07-03T16:00:00.000Z', 'scheduled', 'tG2', 'tH2', null),
    // placeholder sin cruce definido (homeTeam null)
    m('ko-r16-1', 'r16', 1, '2026-07-05T16:00:00.000Z', 'finished', 'tA1', 'tC1', { scoreHome: 0, scoreAway: 0, winnerTeamId: 'tA1' }),
  ]
}

export function makeDb(): Db {
  const { teams, groups } = buildCatalog()
  const koMatches = buildKoMatches()

  const participants = [
    { id: 'p-admin', googleSub: 'sub-admin', name: 'Admin', email: 'admin@polla.com', phone: '+573000000000', role: 'admin' as const },
    { id: 'p-juan', googleSub: 'sub-juan', name: 'Juan', email: 'juan@gmail.com', phone: '+573001111111', role: 'participant' as const },
    { id: 'p-maria', googleSub: 'sub-maria', name: 'María', email: 'maria@gmail.com', phone: '+573002222222', role: 'participant' as const },
    { id: 'p-luis', googleSub: 'sub-luis', name: 'Luis', email: 'luis@gmail.com', phone: '+573003333333', role: 'participant' as const },
    { id: 'p-pedro', googleSub: 'sub-pedro', name: 'Pedro', email: 'pedro@gmail.com', phone: '+573004444444', role: 'participant' as const },
  ]

  // juan y maria: predicciones de grupos IDÉNTICAS (12 completas) + mismos terceros + mismos powerups
  // → groups/thirds/powerups iguales; el desempate sale solo del KO.
  const groupPredictions = [
    ...completeRankings('p-juan', groups),
    ...completeRankings('p-maria', groups),
    // luis: solo 3 grupos completos (parcial → menor total, sin 8 candidatos)
    ...completeRankings('p-luis', groups.slice(0, 3)),
  ]

  // terceros = el equipo en posición 3 de cada grupo = tX3. Selección de 8 (grupos A..H).
  const eightThirds = GROUP_LABELS.slice(0, 8).map((L) => `t${L}3`)
  const officialBestThirds = GROUP_LABELS.slice(0, 8).map((L) => `t${L}3`) // todos aciertan (demo)
  const thirdsSelections = [
    { participantId: 'p-juan', teamIds: [...eightThirds] },
    { participantId: 'p-maria', teamIds: [...eightThirds] },
  ]

  const powerups = [
    { participantId: 'p-juan', darkHorseTeamId: 'tA4', disappointmentTeamId: 'tA1' },
    { participantId: 'p-maria', darkHorseTeamId: 'tA4', disappointmentTeamId: 'tA1' },
    // luis sin powerups (POST 201 test)
  ]

  // KO desempate (escalas r32=1, r16=2; advances=10, exact=5):
  // juan: r32-1 exacto(15)+r32-2 exacto(15)+r16-1 solo avanza(20) = 50, 2 exactos
  // maria: r32-1 avanza(10)+r32-2 avanza(10)+r16-1 exacto(30) = 50, 1 exacto
  const koPredictions = [
    { participantId: 'p-juan', matchId: 'ko-r32-1', scoreHome: 2, scoreAway: 1, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-juan', matchId: 'ko-r32-2', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tC1', tripleActive: false },
    { participantId: 'p-juan', matchId: 'ko-r16-1', scoreHome: 3, scoreAway: 1, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r32-1', scoreHome: 3, scoreAway: 0, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r32-2', scoreHome: 2, scoreAway: 0, teamAdvancesId: 'tC1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r16-1', scoreHome: 0, scoreAway: 0, teamAdvancesId: 'tA1', tripleActive: false },
    // pedro: 3 triples activos en partidos abiertos → triple agotado
    { participantId: 'p-pedro', matchId: 'ko-r32-open-1', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tG1', tripleActive: true },
    { participantId: 'p-pedro', matchId: 'ko-r32-open-2', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tA2', tripleActive: true },
    { participantId: 'p-pedro', matchId: 'ko-r32-open-3', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tC2', tripleActive: true },
  ]

  // standing oficial = orden natural (tX1..tX4) por grupo → juan/maria aciertan todo (demo de puntos)
  const officialGroupStandings: Record<string, string[]> = {}
  for (const g of groups) officialGroupStandings[g.id] = [...g.teamIds]

  // rondas avanzadas para powerups: darkHorse tA4 avanzó 2, disappointment tA1 avanzó 1
  const teamRoundsAdvanced: Record<string, number> = { tA4: 2, tA1: 1 }

  return {
    currentSessionId: null,
    tournamentStartAt: '2026-06-11T16:00:00.000Z',
    participants,
    invitations: [
      { id: 'inv-ok', code: 'OK1234', usedByParticipantId: null, usedAt: null, expiresAt: '2026-06-12T15:00:00.000Z', createdAt: '2026-06-06T15:00:00.000Z' },
      { id: 'inv-used', code: 'USED99', usedByParticipantId: 'p-juan', usedAt: '2026-06-06T16:00:00.000Z', expiresAt: '2026-06-12T15:00:00.000Z', createdAt: '2026-06-06T15:00:00.000Z' },
      { id: 'inv-exp', code: 'EXP000', usedByParticipantId: null, usedAt: null, expiresAt: '2026-06-05T15:00:00.000Z', createdAt: '2026-06-04T15:00:00.000Z' },
    ],
    teams, groups, groupPredictions, thirdsSelections, powerups,
    koRounds: [
      { slug: 'r32', name: 'Dieciseisavos', order: 1 }, { slug: 'r16', name: 'Octavos', order: 2 },
      { slug: 'qf', name: 'Cuartos', order: 3 }, { slug: 'sf', name: 'Semifinal', order: 4 },
      { slug: '3rd', name: 'Tercer puesto', order: 5 }, { slug: 'final', name: 'Final', order: 6 },
    ],
    koMatches, koPredictions, scoringParams: SCORING,
    officialGroupStandings, officialBestThirds, teamRoundsAdvanced,
  }
}

export function resetDb(): void { setDb(makeDb()) }

setDb(makeDb())
