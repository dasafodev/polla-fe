import { setDb, type Db, type DbTeam, type DbGroup, type DbKoMatch, type DbKoRound, type DbParticipant, type DbGroupMatch } from './db'
import type { RoundSlug, ScoringParams } from '../types/enums'

const GROUP_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const
// 8 top8 = el equipo "1" de los primeros 8 grupos
const TOP8 = new Set(['tA1', 'tB1', 'tC1', 'tD1', 'tE1', 'tF1', 'tG1', 'tH1'])
// 48 códigos ISO (1 por equipo) para sembrar banderas reales en el demo con mocks.
const FLAG_CODES = ['mx', 'ca', 'us', 'ar', 'br', 'fr', 'es', 'de', 'pt', 'nl', 'be', 'hr', 'ma', 'jp', 'kr', 'sn', 'au', 'co', 'uy', 'ec', 'ch', 'dk', 'rs', 'gh', 'cm', 'tn', 'sa', 'ir', 'qa', 'cr', 'pl', 'ng', 'eg', 'dz', 'ci', 'no', 'se', 'it', 'gb', 'cl', 'pe', 'py', 've', 'bo', 'pa', 'jm', 'nz', 'za']
const flagUrl = (i: number) => `https://flagcdn.com/w80/${FLAG_CODES[i % FLAG_CODES.length]}.png`

function buildCatalog(): { teams: DbTeam[]; groups: DbGroup[] } {
  const teams: DbTeam[] = []
  const groups: DbGroup[] = []
  for (const L of GROUP_LABELS) {
    const groupId = `g-${L}`
    const teamIds: string[] = []
    for (let i = 1; i <= 4; i++) {
      const id = `t${L}${i}`
      teams.push({ id, name: `Equipo ${L}${i}`, code: `${L}${i}`, isTop8: TOP8.has(id), flag: flagUrl(teams.length), groupId })
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

// Valores del backend (polla-be/prisma/seed.ts). Grupos no paga posiciones parciales (partial = 0).
const SCORING: ScoringParams = {
  pts_group_position_exact: 5, pts_group_position_partial: 0, bonus_group_complete: 20,
  pts_third_correct: 10, pts_ko_advances: 2, pts_ko_exact_score: 3,
  pts_dark_horse_per_round: 5, pts_disappointment_per_round: 5, mult_triple: 3, mult_colombia_ko: 5,
  scale_r32: 1, scale_r16: 2, scale_qf: 5, scale_sf: 7, scale_final: 10,
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
    status, homeTeamId, awayTeamId, homeTeamLabel: homeTeamId ? null : `Pos ${n}`, awayTeamLabel: awayTeamId ? null : `Pos ${n}b`,
    homeSource: null, awaySource: null, result,
  })
  // Cruce aún sin definir: sin equipos, con rótulo descriptivo. El mock SÍ expone estos labels
  // (el backend real los descarta y manda null → el FE cae a "Por definir"). Sirve para demostrar
  // el marcado de partidos cuyos clasificados todavía no se conocen.
  const u = (
    id: string, roundSlug: DbKoMatch['roundSlug'], n: number, scheduledAt: string,
    homeTeamLabel: string, awayTeamLabel: string,
  ): DbKoMatch => ({
    id, roundSlug, externalMatchId: 1000 + n, matchNumber: n, scheduledAt, lockedAt: lock(scheduledAt),
    status: 'scheduled', homeTeamId: null, awayTeamId: null, homeTeamLabel, awayTeamLabel,
    homeSource: null, awaySource: null, result: null,
  })
  const matches: DbKoMatch[] = [
    // finished (desempate): r32-1, r32-2 y r16-1. scheduledAt en el pasado respecto al reloj de
    // test (6-jun) → lockedIn true (un partido terminado está cerrado). Datos ilustrativos (§13 riesgo 7).
    m('ko-r32-1', 'r32', 1, '2026-06-01T16:00:00.000Z', 'finished', 'tA1', 'tB1', { scoreHome: 2, scoreAway: 1, winnerTeamId: 'tA1' }),
    m('ko-r32-2', 'r32', 2, '2026-06-02T20:00:00.000Z', 'finished', 'tC1', 'tD1', { scoreHome: 1, scoreAway: 0, winnerTeamId: 'tC1' }),
    // locked sin resultado: lockedAt en el pasado respecto a now de test (2026-06-06) → MATCH_LOCKED sin setNow
    m('ko-r32-locked', 'r32', 3, '2026-06-05T16:00:00.000Z', 'scheduled', 'tE1', 'tF1', null),
    // abiertos (lockedAt futuro): para crear/editar predicciones en tests
    m('ko-r32-open-1', 'r32', 4, '2026-06-29T16:00:00.000Z', 'scheduled', 'tG1', 'tH1', null),
    m('ko-r32-open-2', 'r32', 5, '2026-06-30T16:00:00.000Z', 'scheduled', 'tA2', 'tB2', null),
    m('ko-r32-open-3', 'r32', 6, '2026-07-01T16:00:00.000Z', 'scheduled', 'tC2', 'tD2', null),
    m('ko-r32-open-4', 'r32', 7, '2026-07-02T16:00:00.000Z', 'scheduled', 'tE2', 'tF2', null),
    m('ko-r32-open-5', 'r32', 8, '2026-07-03T16:00:00.000Z', 'scheduled', 'tG2', 'tH2', null),
    // R32 restantes (9–16): cruces definidos abiertos que completan la primera columna del cuadro
    m('ko-r32-9', 'r32', 9, '2026-07-01T18:00:00.000Z', 'scheduled', 'tI1', 'tJ1', null),
    m('ko-r32-10', 'r32', 10, '2026-07-01T22:00:00.000Z', 'scheduled', 'tK1', 'tL1', null),
    m('ko-r32-11', 'r32', 11, '2026-07-02T18:00:00.000Z', 'scheduled', 'tI2', 'tJ2', null),
    m('ko-r32-12', 'r32', 12, '2026-07-02T22:00:00.000Z', 'scheduled', 'tK2', 'tL2', null),
    m('ko-r32-13', 'r32', 13, '2026-07-03T18:00:00.000Z', 'scheduled', 'tA3', 'tB3', null),
    m('ko-r32-14', 'r32', 14, '2026-07-03T22:00:00.000Z', 'scheduled', 'tC3', 'tD3', null),
    m('ko-r32-15', 'r32', 15, '2026-07-04T18:00:00.000Z', 'scheduled', 'tE3', 'tF3', null),
    m('ko-r32-16', 'r32', 16, '2026-07-04T22:00:00.000Z', 'scheduled', 'tG3', 'tH3', null),
    // R16 (octavos): r16-1 finished (desempate) + 2 definidos abiertos + 5 por definir
    m('ko-r16-1', 'r16', 1, '2026-06-03T16:00:00.000Z', 'finished', 'tA1', 'tC1', { scoreHome: 0, scoreAway: 0, winnerTeamId: 'tA1' }),
    m('ko-r16-2', 'r16', 2, '2026-07-05T18:00:00.000Z', 'scheduled', 'tE1', 'tG1', null),
    m('ko-r16-3', 'r16', 3, '2026-07-05T22:00:00.000Z', 'scheduled', 'tB2', 'tD2', null),
    u('ko-r16-4', 'r16', 4, '2026-07-06T18:00:00.000Z', 'Ganador 16avos 7', 'Ganador 16avos 8'),
    u('ko-r16-5', 'r16', 5, '2026-07-06T22:00:00.000Z', 'Ganador 16avos 9', 'Ganador 16avos 10'),
    u('ko-r16-6', 'r16', 6, '2026-07-07T18:00:00.000Z', 'Ganador 16avos 11', 'Ganador 16avos 12'),
    u('ko-r16-7', 'r16', 7, '2026-07-07T22:00:00.000Z', 'Ganador 16avos 13', 'Ganador 16avos 14'),
    u('ko-r16-8', 'r16', 8, '2026-07-08T18:00:00.000Z', 'Ganador 16avos 15', 'Ganador 16avos 16'),
    // Cuartos de final (todos por definir)
    u('ko-qf-1', 'qf', 1, '2026-07-10T18:00:00.000Z', 'Ganador 8vos 1', 'Ganador 8vos 2'),
    u('ko-qf-2', 'qf', 2, '2026-07-10T22:00:00.000Z', 'Ganador 8vos 3', 'Ganador 8vos 4'),
    u('ko-qf-3', 'qf', 3, '2026-07-11T18:00:00.000Z', 'Ganador 8vos 5', 'Ganador 8vos 6'),
    u('ko-qf-4', 'qf', 4, '2026-07-11T22:00:00.000Z', 'Ganador 8vos 7', 'Ganador 8vos 8'),
    // Semifinales
    u('ko-sf-1', 'sf', 1, '2026-07-14T18:00:00.000Z', 'Ganador 4tos 1', 'Ganador 4tos 2'),
    u('ko-sf-2', 'sf', 2, '2026-07-15T18:00:00.000Z', 'Ganador 4tos 3', 'Ganador 4tos 4'),
    // Tercer puesto
    u('ko-3rd-1', '3rd', 1, '2026-07-18T18:00:00.000Z', 'Perdedor Semifinal 1', 'Perdedor Semifinal 2'),
    // Final
    u('ko-final-1', 'final', 1, '2026-07-19T18:00:00.000Z', 'Ganador Semifinal 1', 'Ganador Semifinal 2'),
  ]
  linkBracketFeeders(matches)
  return matches
}

// Cablea homeSource/awaySource como lo hace el backend real (linkBracketFeeders + BRACKET_FEEDERS),
// pero sobre la numeración POR RONDA del mock (el backend usa matchNumber global 1–104). El cuadro del
// mock sí es binario-adyacente, así que el partido M de una ronda lo alimentan el 2M-1 (local) y 2M
// (visitante) de la ronda previa; la final toma los GANADORES de las semis y el 3er puesto los PERDEDORES.
function linkBracketFeeders(matches: DbKoMatch[]): void {
  const byKey = new Map(matches.map((m) => [`${m.roundSlug}:${m.matchNumber}`, m]))
  const src = (slug: RoundSlug, n: number, outcome: 'WINNER' | 'LOSER') => {
    const f = byKey.get(`${slug}:${n}`)
    return f ? { matchId: f.id, matchNumber: f.matchNumber, outcome } : null
  }
  const FEEDER: Partial<Record<RoundSlug, RoundSlug>> = { r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf' }
  for (const m of matches) {
    if (m.roundSlug === 'final') {
      m.homeSource = src('sf', 1, 'WINNER'); m.awaySource = src('sf', 2, 'WINNER')
    } else if (m.roundSlug === '3rd') {
      m.homeSource = src('sf', 1, 'LOSER'); m.awaySource = src('sf', 2, 'LOSER')
    } else {
      const feeder = FEEDER[m.roundSlug]
      if (!feeder) continue // r32 viene de grupos → sin alimentadores
      m.homeSource = src(feeder, m.matchNumber * 2 - 1, 'WINNER')
      m.awaySource = src(feeder, m.matchNumber * 2, 'WINNER')
    }
  }
}

// Partidos de fase de grupos (informativos). Resultados consistentes con officialGroupStandings
// (orden natural tX1..tX4): los grupos A y B ya tienen tabla, el resto no ha jugado.
function buildGroupMatches(): DbGroupMatch[] {
  const gm = (
    id: string, groupId: string, n: number, scheduledAt: string,
    status: DbGroupMatch['status'], homeTeamId: string, awayTeamId: string,
    scoreHome: number | null, scoreAway: number | null,
  ): DbGroupMatch => ({ id, matchNumber: n, groupId, scheduledAt, status, homeTeamId, awayTeamId, scoreHome, scoreAway })
  return [
    // 11-jun (día inaugural): grupo A jugó la fecha 1 completa
    gm('gm-a1', 'g-A', 1, '2026-06-11T16:00:00.000Z', 'finished', 'tA1', 'tA4', 3, 0),
    gm('gm-a2', 'g-A', 2, '2026-06-11T20:00:00.000Z', 'finished', 'tA2', 'tA3', 1, 0),
    // 12-jun Colombia: uno terminado, uno EN VIVO y uno programado (00:30Z del 13 = 7:30 p. m. del 12 en Bogotá)
    gm('gm-b1', 'g-B', 3, '2026-06-12T16:00:00.000Z', 'finished', 'tB1', 'tB4', 2, 1),
    gm('gm-b2', 'g-B', 4, '2026-06-12T20:00:00.000Z', 'live', 'tB2', 'tB3', 1, 1),
    gm('gm-c1', 'g-C', 5, '2026-06-13T00:30:00.000Z', 'scheduled', 'tC1', 'tC2', null, null),
    // 13-jun: para ejercitar el filtro por fecha
    gm('gm-d1', 'g-D', 6, '2026-06-13T16:00:00.000Z', 'scheduled', 'tD1', 'tD2', null, null),
  ]
}

const KO_ROUNDS: DbKoRound[] = [
  { slug: 'r32', name: 'Dieciseisavos', order: 1 }, { slug: 'r16', name: 'Octavos', order: 2 },
  { slug: 'qf', name: 'Cuartos', order: 3 }, { slug: 'sf', name: 'Semifinal', order: 4 },
  { slug: '3rd', name: 'Tercer puesto', order: 5 }, { slug: 'final', name: 'Final', order: 6 },
]

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

  // KO desempate (escalas r32=1, r16=2; advances=2, exact=3):
  // juan: r32-1 exacto(5)+r32-2 exacto(5)+r16-1 solo avanza(4) = 14, 2 exactos
  // maria: r32-1 avanza(2)+r32-2 avanza(2)+r16-1 exacto(10) = 14, 1 exacto
  const koPredictions = [
    { participantId: 'p-juan', matchId: 'ko-r32-1', scoreHome: 2, scoreAway: 1, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-juan', matchId: 'ko-r32-2', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tC1', tripleActive: false },
    { participantId: 'p-juan', matchId: 'ko-r16-1', scoreHome: 3, scoreAway: 1, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r32-1', scoreHome: 3, scoreAway: 0, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r32-2', scoreHome: 2, scoreAway: 0, teamAdvancesId: 'tC1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r16-1', scoreHome: 0, scoreAway: 0, teamAdvancesId: 'tA1', tripleActive: false },
    // pedro: 3 triples activos en partidos abiertos (de 8 disponibles → aún le quedan 5)
    { participantId: 'p-pedro', matchId: 'ko-r32-open-1', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tG1', tripleActive: true },
    { participantId: 'p-pedro', matchId: 'ko-r32-open-2', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tA2', tripleActive: true },
    { participantId: 'p-pedro', matchId: 'ko-r32-open-3', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tC2', tripleActive: true },
  ]

  // standing oficial = orden natural (tX1..tX4) por grupo → juan/maria aciertan todo (demo de puntos)
  const officialGroupStandings: Record<string, string[]> = {}
  for (const g of groups) officialGroupStandings[g.id] = [...g.teamIds]

  // rondas avanzadas para powerups (escalan por ronda): darkHorse tA4 avanzó 2 → +5×(1+2)=15;
  // disappointment tA1 avanzó 1 → −5×1=−5
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
    koRounds: [...KO_ROUNDS],
    koMatches, koPredictions, groupMatches: buildGroupMatches(), scoringParams: SCORING,
    officialGroupStandings, officialBestThirds, teamRoundsAdvanced,
  }
}

// "Mundo vacío": un usuario nuevo recién entrando, lo más vacío posible. Conserva el catálogo
// (equipos/grupos/rondas) para poder armar la polla, pero sin predicciones, sin partidos KO, sin
// resultados, sin otros jugadores → Inicio "Vacía", Tabla vacía, Predicciones en 0.
const NEW_USER: DbParticipant = {
  id: 'p-nuevo', googleSub: 'sub-nuevo', name: 'Nuevo', email: 'nuevo@gmail.com', phone: null, role: 'participant',
}

export function makeEmptyWorldDb(): Db {
  const { teams, groups } = buildCatalog()
  return {
    currentSessionId: null,
    tournamentStartAt: '2026-06-11T16:00:00.000Z',
    participants: [{ ...NEW_USER }],
    invitations: [],
    teams, groups,
    groupPredictions: [], thirdsSelections: [], powerups: [],
    koRounds: [...KO_ROUNDS],
    koMatches: [], koPredictions: [], groupMatches: [],
    scoringParams: SCORING,
    officialGroupStandings: null, officialBestThirds: null, teamRoundsAdvanced: null,
  }
}

export function resetDb(): void { setDb(makeDb()) }

setDb(makeDb())
