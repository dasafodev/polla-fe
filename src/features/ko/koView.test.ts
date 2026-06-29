import { describe, it, expect } from 'vitest'
import {
  buildColumns,
  isDetermined,
  sideLabel,
  advancesName,
  tripleUsesRemaining,
  predictionProgress,
  KO_MATCH_COUNTS,
} from './koView'
import type { KoMatch, KoMatchesResponse, KoTeam } from '../../types/api'
import type { RoundSlug } from '../../types/enums'

const team = (id: string): KoTeam => ({ id, name: `Equipo ${id}`, code: id.toUpperCase(), flag: null })

function match(over: Partial<KoMatch> = {}): KoMatch {
  return {
    id: 'm1',
    externalMatchId: 1,
    matchNumber: 1,
    scheduledAt: '2026-07-01T18:00:00.000Z',
    lockedAt: '2026-07-01T17:30:00.000Z',
    status: 'scheduled',
    locked: false,
    homeTeam: team('a'),
    awayTeam: team('b'),
    homeTeamLabel: null,
    awayTeamLabel: null,
    result: null,
    myPrediction: null,
    ...over,
  }
}

function round(slug: RoundSlug, matches: KoMatch[]): KoMatchesResponse {
  return { round: { slug, name: slug, order: 1 }, matches }
}

describe('isDetermined / sideLabel', () => {
  it('determinado cuando ambos equipos existen', () => {
    expect(isDetermined(match())).toBe(true)
    expect(isDetermined(match({ homeTeam: null }))).toBe(false)
    expect(isDetermined(match({ awayTeam: null }))).toBe(false)
  })

  it('sideLabel: equipo → rótulo → "Por definir"', () => {
    expect(sideLabel(match(), 'home')).toBe('Equipo a')
    expect(sideLabel(match({ homeTeam: null, homeTeamLabel: 'Ganador Grupo A' }), 'home')).toBe('Ganador Grupo A')
    expect(sideLabel(match({ homeTeam: null, homeTeamLabel: null }), 'home')).toBe('Por definir')
  })
})

describe('advancesName', () => {
  it('devuelve el nombre del equipo marcado como clasificado', () => {
    const m = match({ myPrediction: { scoreHome: 1, scoreAway: 0, teamAdvancesId: 'b', tripleActive: false, lockedIn: false, pointsEarned: null } })
    expect(advancesName(m)).toBe('Equipo b')
  })
  it('null si no hay pronóstico', () => {
    expect(advancesName(match())).toBeNull()
  })
})

describe('tripleUsesRemaining', () => {
  it('descuenta del tope global de 3 contando todas las rondas', () => {
    const triple = (id: string): KoMatch =>
      match({ id, myPrediction: { scoreHome: 1, scoreAway: 0, teamAdvancesId: 'a', tripleActive: true, lockedIn: false, pointsEarned: null } })
    const rounds = [round('r32', [triple('x'), triple('y')]), round('r16', [match({ id: 'z' }), match()])]
    expect(tripleUsesRemaining(rounds)).toBe(1) // 2 triples usados de 3
  })
  it('nunca baja de 0', () => {
    const triple = (id: string): KoMatch =>
      match({ id, myPrediction: { scoreHome: 1, scoreAway: 0, teamAdvancesId: 'a', tripleActive: true, lockedIn: false, pointsEarned: null } })
    const rounds = [round('r32', [triple('a'), triple('b'), triple('c'), triple('d')])]
    expect(tripleUsesRemaining(rounds)).toBe(0)
  })
})

describe('predictionProgress', () => {
  it('cuenta solo partidos definidos', () => {
    const withPred = match({ id: 'p', myPrediction: { scoreHome: 1, scoreAway: 0, teamAdvancesId: 'a', tripleActive: false, lockedIn: false, pointsEarned: null } })
    const undetermined = match({ id: 'u', homeTeam: null, awayTeam: null })
    const rounds = [round('r32', [withPred, match({ id: 'q' }), undetermined])]
    expect(predictionProgress(rounds)).toEqual({ done: 1, total: 2 })
  })
})

describe('buildColumns', () => {
  it('rellena cada ronda hasta el conteo fijo y ordena R32→Final con 3er puesto antes de la final', () => {
    const cols = buildColumns([round('r32', [match({ id: 'a', matchNumber: 2 }), match({ id: 'b', matchNumber: 1 })])])
    expect(cols.map((c) => c.slug)).toEqual(['r32', 'r16', 'qf', 'sf', '3rd', 'final'])
    const r32 = cols[0]
    expect(r32.slots).toHaveLength(KO_MATCH_COUNTS.r32) // 16
    // misma fecha → desempata por matchNumber asc: b (1) antes que a (2)
    expect(r32.slots[0].match?.id).toBe('b')
    expect(r32.slots[1].match?.id).toBe('a')
    expect(r32.slots[2].match).toBeNull() // resto rellenado con cupos vacíos
    // rondas sin datos: todas en placeholders, con su conteo fijo
    expect(cols[2].slots).toHaveLength(KO_MATCH_COUNTS.qf)
    expect(cols[5].slots).toHaveLength(1) // final
    expect(cols[1].slots).toHaveLength(KO_MATCH_COUNTS.r16) // 8
    expect(cols[2].slots.every((s) => s.match === null)).toBe(true) // rondas sin datos: todo placeholder
  })

  it('ordena cada ronda: por jugar (más pronto→más lejano) primero, los ya pasados al final', () => {
    const soon = match({ id: 'soon', matchNumber: 9, scheduledAt: '2026-06-29T16:00:00.000Z' })
    const later = match({ id: 'later', matchNumber: 3, scheduledAt: '2026-07-02T16:00:00.000Z' })
    const finished = match({ id: 'fin', matchNumber: 1, scheduledAt: '2026-06-20T16:00:00.000Z', status: 'finished' })
    const live = match({ id: 'live', matchNumber: 2, scheduledAt: '2026-06-25T16:00:00.000Z', status: 'live' })
    const lockedUp = match({ id: 'lck', matchNumber: 5, scheduledAt: '2026-06-26T16:00:00.000Z', locked: true })
    // Orden de entrada arbitrario; se reordena por estado y fecha.
    const cols = buildColumns([round('r32', [finished, later, lockedUp, soon, live])])
    const slotIds = cols[0].slots.map((s) => s.match?.id ?? '·')
    // por jugar primero (soon 6/29 antes que later 7/2)
    expect(slotIds.slice(0, 2)).toEqual(['soon', 'later'])
    // luego cupos "Por definir" (·), y los ya pasados al final en orden cronológico (fin 6/20, live 6/25, lck 6/26)
    expect(slotIds[2]).toBe('·')
    expect(slotIds.slice(-3)).toEqual(['fin', 'live', 'lck'])
    // solo los pronosticados/jugables ocupan slot; el orden de IDs ocupados es estable
    expect(slotIds.filter((id) => id !== '·')).toEqual(['soon', 'later', 'fin', 'live', 'lck'])
  })

  it("orden 'bracket': posición FIJA por matchNumber, NO reordena al jugarse los partidos", () => {
    // Mismos partidos que el test de prioridad, pero en modo bracket el orden NO cambia con el estado:
    // cada partido queda en su índice matchNumber-1 (los jugados NO se van al final).
    const finished = match({ id: 'fin', matchNumber: 1, scheduledAt: '2026-06-20T16:00:00.000Z', status: 'finished' })
    const live = match({ id: 'live', matchNumber: 2, scheduledAt: '2026-06-25T16:00:00.000Z', status: 'live' })
    const later = match({ id: 'later', matchNumber: 3, scheduledAt: '2026-07-02T16:00:00.000Z' })
    const soon = match({ id: 'soon', matchNumber: 9, scheduledAt: '2026-06-29T16:00:00.000Z' })
    const cols = buildColumns([round('r32', [soon, finished, later, live])], 'bracket')
    const slotIds = cols[0].slots.map((s) => s.match?.id ?? '·')
    expect(slotIds[0]).toBe('fin') // matchNumber 1 → índice 0, aunque esté finished
    expect(slotIds[1]).toBe('live') // matchNumber 2 → índice 1
    expect(slotIds[2]).toBe('later') // matchNumber 3 → índice 2
    expect(slotIds[8]).toBe('soon') // matchNumber 9 → índice 8
    expect(cols[0].slots).toHaveLength(KO_MATCH_COUNTS.r32)
  })

  it('proyecta el ganador de la ronda previa al cupo sin definir de la siguiente', () => {
    // R32 #1 (terminado, gana a) y #2 (terminado, gana c) alimentan al R16 #1 (local←1, visitante←2).
    const r32a = match({
      id: 'r32-1', matchNumber: 1, status: 'finished',
      homeTeam: team('a'), awayTeam: team('b'), result: { scoreHome: 2, scoreAway: 1, winnerTeamId: 'a' },
    })
    const r32b = match({
      id: 'r32-2', matchNumber: 2, status: 'finished',
      homeTeam: team('c'), awayTeam: team('d'), result: { scoreHome: 0, scoreAway: 3, winnerTeamId: 'd' },
    })
    const r16 = match({ id: 'r16-1', matchNumber: 1, homeTeam: null, awayTeam: null })
    const cols = buildColumns([round('r32', [r32a, r32b]), round('r16', [r16])], 'bracket')
    const slot = cols[1].slots.find((s) => s.match?.id === 'r16-1')!
    expect(slot.projHome?.id).toBe('a') // ganador de R32 #1
    expect(slot.projAway?.id).toBe('d') // ganador de R32 #2
  })

  it('proyección parcial: solo sube el lado cuyo alimentador ya terminó', () => {
    const r32a = match({
      id: 'r32-1', matchNumber: 1, status: 'finished',
      homeTeam: team('a'), awayTeam: team('b'), result: { scoreHome: 2, scoreAway: 1, winnerTeamId: 'a' },
    })
    const r32b = match({ id: 'r32-2', matchNumber: 2, homeTeam: team('c'), awayTeam: team('d') }) // sin jugar
    const r16 = match({ id: 'r16-1', matchNumber: 1, homeTeam: null, awayTeam: null })
    const cols = buildColumns([round('r32', [r32a, r32b]), round('r16', [r16])], 'bracket')
    const slot = cols[1].slots.find((s) => s.match?.id === 'r16-1')!
    expect(slot.projHome?.id).toBe('a')
    expect(slot.projAway).toBeNull()
  })

  it('no proyecta sobre lados ya oficiales ni sobre el 3er puesto (perdedores)', () => {
    const r32a = match({
      id: 'r32-1', matchNumber: 1, status: 'finished',
      homeTeam: team('a'), awayTeam: team('b'), result: { scoreHome: 2, scoreAway: 1, winnerTeamId: 'a' },
    })
    // R16 con el local ya oficial: no se debe pisar con la proyección.
    const r16 = match({ id: 'r16-1', matchNumber: 1, homeTeam: team('x'), awayTeam: null })
    const cols = buildColumns([round('r32', [r32a]), round('r16', [r16])], 'bracket')
    const slot = cols[1].slots.find((s) => s.match?.id === 'r16-1')!
    expect(slot.projHome).toBeNull() // lado oficial → sin proyección
  })

  it('acumula puntos KO de la ronda', () => {
    const scored = match({ id: 's', myPrediction: { scoreHome: 2, scoreAway: 1, teamAdvancesId: 'a', tripleActive: false, lockedIn: true, pointsEarned: { pts_ko_advances: 2, pts_ko_exact_score: 3, mult_triple: 0, scale_factor: 1, scale_slug: 'scale_r32', total: 5 } } })
    const cols = buildColumns([round('r32', [scored])])
    expect(cols[0].points).toBe(5)
  })
})
