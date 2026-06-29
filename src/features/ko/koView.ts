import type { KoMatch, KoMatchesResponse, KoTeam } from '../../types/api'
import { ROUND_SLUGS, type RoundSlug } from '../../types/enums'

// Estructura fija del Mundial de 48 (R32→Final). El API /ko NO expone el conteo de partidos por
// ronda (Round.matchCount queda del lado del backend), así que lo fijamos aquí para poder dibujar
// TODO el cuadro hasta la final aunque una ronda aún no tenga partidos cargados.
export const KO_MATCH_COUNTS: Record<RoundSlug, number> = {
  r32: 16,
  r16: 8,
  qf: 4,
  sf: 2,
  '3rd': 1,
  final: 1,
}

// Nombre largo (encabezados de sección en la lista) y corto (columnas estrechas del bracket).
export const ROUND_LONG: Record<RoundSlug, string> = {
  r32: 'Dieciseisavos',
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semifinal',
  '3rd': 'Tercer puesto',
  final: 'Final',
}

export const ROUND_SHORT: Record<RoundSlug, string> = {
  r32: '16avos',
  r16: '8vos',
  qf: '4tos',
  sf: 'Semis',
  '3rd': '3er puesto',
  final: 'Final',
}

const PLACEHOLDER = 'Por definir'

// Un partido es jugable solo cuando ambos clasificados ya se conocen: el backend valida
// teamAdvancesId contra los equipos del partido, así que un cruce sin definir no admite pronóstico.
export function isDetermined(m: KoMatch): boolean {
  return m.homeTeam != null && m.awayTeam != null
}

// Nombre a mostrar de un lado: equipo real → rótulo del backend ("Ganador Grupo A") → "Por definir".
// En producción el backend hoy manda homeTeamLabel = null para cruces sin definir, por eso el
// fallback final es genérico (ver nota en la implementación; requiere arreglo de backend).
export function sideLabel(m: KoMatch, side: 'home' | 'away'): string {
  const team = side === 'home' ? m.homeTeam : m.awayTeam
  const label = side === 'home' ? m.homeTeamLabel : m.awayTeamLabel
  return team?.name ?? label ?? PLACEHOLDER
}

// Nombre del equipo que el usuario marcó como clasificado (o null si no hay pronóstico).
export function advancesName(m: KoMatch): string | null {
  const id = m.myPrediction?.teamAdvancesId
  if (!id) return null
  if (m.homeTeam?.id === id) return m.homeTeam.name
  if (m.awayTeam?.id === id) return m.awayTeam.name
  return null
}

// "Triple o nada" tiene tope global de 3 por participante. Se cuenta sobre TODAS las rondas.
export function tripleUsesRemaining(rounds: KoMatchesResponse[]): number {
  const used = rounds.reduce(
    (n, r) => n + r.matches.filter((m) => m.myPrediction?.tripleActive).length,
    0,
  )
  return Math.max(0, 3 - used)
}

// Cuántos partidos jugables (definidos) ya tienen pronóstico, sobre el total de jugables.
export function predictionProgress(rounds: KoMatchesResponse[]): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const r of rounds) {
    for (const m of r.matches) {
      if (!isDetermined(m)) continue
      total += 1
      if (m.myPrediction) done += 1
    }
  }
  return { done, total }
}

export interface KoSlot {
  // match === null → cupo aún no cargado por el backend (placeholder puro de estructura).
  match: KoMatch | null
  round: RoundSlug
  index: number
  // Equipos PROYECTADOS para un cruce aún sin definir oficialmente: el ganador de la ronda anterior
  // "sube" a su cupo para que la llave se arme a medida que se juegan los partidos. Es solo visual
  // (el backend todavía no cargó homeTeam/awayTeam), así que el cruce no se vuelve pronosticable.
  projHome: KoTeam | null
  projAway: KoTeam | null
}

export interface KoColumn {
  slug: RoundSlug
  name: string
  short: string
  slots: KoSlot[]
  // Puntos KO acumulados del usuario en la ronda (solo relevante con la polla cerrada/resuelta).
  points: number
}

// Un partido "ya pasó" cuando ya no se puede llenar: arrancó (live), terminó (finished) o se cerró
// el candado de pronóstico (locked). Esos van al final para priorizar los que faltan por llenar.
function hasStarted(m: KoMatch): boolean {
  return m.status === 'live' || m.status === 'finished' || m.locked
}

// Orden cronológico: del más pronto al más lejano (scheduledAt es ISO → ordena como string);
// empate por matchNumber para un orden estable.
function byKickoff(a: KoMatch, b: KoMatch): number {
  const t = a.scheduledAt.localeCompare(b.scheduledAt)
  return t !== 0 ? t : a.matchNumber - b.matchNumber
}

// Cómo ordenar los partidos dentro de cada columna.
//  - 'priority' (Lista): primero los que faltan por jugar; los jugados al final. Reordena con el estado.
//  - 'bracket'  (Llaves): posición FIJA por matchNumber, no se mueve aunque se jueguen los partidos.
export type KoColumnOrder = 'priority' | 'bracket'

// Orden por prioridad (Lista): por jugar (más pronto→más lejano), luego cupos vacíos, luego los ya
// jugados (cronológico). Así arriba quedan los cruces que el usuario todavía puede llenar.
function priorityOrder(matches: KoMatch[], count: number): (KoMatch | null)[] {
  const upcoming = matches.filter((m) => !hasStarted(m)).sort(byKickoff)
  const played = matches.filter(hasStarted).sort(byKickoff)
  const emptyCount = Math.max(0, count - upcoming.length - played.length)
  return [...upcoming, ...Array.from({ length: emptyCount }, () => null), ...played]
}

// Orden estructural (Llaves): cada partido va a su cupo FIJO (índice matchNumber-1), así el cuadro no
// se reordena al jugarse los partidos y la proyección de ganadores cae en su lugar. matchNumbers
// fuera de rango o duplicados (datos atípicos) se anexan al primer hueco libre.
function bracketOrder(matches: KoMatch[], count: number): (KoMatch | null)[] {
  const sorted = [...matches].sort((a, b) => a.matchNumber - b.matchNumber)
  const slots: (KoMatch | null)[] = Array.from({ length: Math.max(count, sorted.length) }, () => null)
  const overflow: KoMatch[] = []
  for (const m of sorted) {
    const i = m.matchNumber - 1
    if (i >= 0 && i < slots.length && slots[i] === null) slots[i] = m
    else overflow.push(m)
  }
  let k = 0
  for (const m of overflow) {
    while (k < slots.length && slots[k] !== null) k++
    if (k < slots.length) slots[k] = m
  }
  return slots
}

// Ronda → ronda que la alimenta con sus GANADORES. El 3er puesto se alimenta de PERDEDORES de semis
// (caso aparte) → no se proyecta automáticamente.
const FEEDER_ROUND: Partial<Record<RoundSlug, RoundSlug>> = {
  r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf',
}

// Equipo ganador (objeto) de un partido ya resuelto, o null si todavía no hay resultado.
function winnerTeam(m: KoMatch): KoTeam | null {
  const id = m.result?.winnerTeamId
  if (!id) return null
  if (m.homeTeam?.id === id) return m.homeTeam
  if (m.awayTeam?.id === id) return m.awayTeam
  return null
}

// Proyección de cruces: a medida que se juegan los partidos de una ronda, el ganador "sube" al cupo
// que le corresponde en la siguiente. Topología binaria de eliminación directa (confirmada por los
// rótulos del backend, p. ej. "Ganador 16avos 7/8" para el partido 4 de octavos): el partido M de
// una ronda lo alimentan los partidos 2M-1 (local) y 2M (visitante) de la ronda anterior.
// Solo proyectamos lados que aún NO tienen equipo oficial (no se pisa lo que ya cargó el backend).
function buildProjection(rounds: KoMatchesResponse[]): Map<string, { home: KoTeam | null; away: KoTeam | null }> {
  const byNumber = new Map<string, KoMatch>()
  for (const r of rounds) for (const m of r.matches) byNumber.set(`${r.round.slug}:${m.matchNumber}`, m)

  const proj = new Map<string, { home: KoTeam | null; away: KoTeam | null }>()
  for (const r of rounds) {
    const feeder = FEEDER_ROUND[r.round.slug]
    if (!feeder) continue
    for (const m of r.matches) {
      if (m.homeTeam && m.awayTeam) continue // cruce ya oficial → nada que proyectar
      const homeFeeder = m.homeTeam ? null : byNumber.get(`${feeder}:${m.matchNumber * 2 - 1}`)
      const awayFeeder = m.awayTeam ? null : byNumber.get(`${feeder}:${m.matchNumber * 2}`)
      const home = homeFeeder ? winnerTeam(homeFeeder) : null
      const away = awayFeeder ? winnerTeam(awayFeeder) : null
      if (home || away) proj.set(m.id, { home, away })
    }
  }
  return proj
}

// Arma las columnas del cuadro en orden de ronda (R32→Final, con 3er puesto antes de la final),
// rellenando cada ronda con cupos vacíos hasta su conteo fijo para que SIEMPRE se vea el camino
// completo hasta la final, incluso si el backend todavía no cargó esa ronda. `order` define cómo se
// ordena dentro de cada ronda (ver KoColumnOrder). En cualquiera de los dos órdenes, cada cupo trae
// además los equipos proyectados (ganadores de la ronda previa) para los cruces aún sin definir.
export function buildColumns(rounds: KoMatchesResponse[], order: KoColumnOrder = 'priority'): KoColumn[] {
  const bySlug = new Map(rounds.map((r) => [r.round.slug, r]))
  const proj = buildProjection(rounds)
  return ROUND_SLUGS.map((slug) => {
    const matches = bySlug.get(slug)?.matches ?? []
    const count = Math.max(KO_MATCH_COUNTS[slug], matches.length)
    const ordered = order === 'bracket' ? bracketOrder(matches, count) : priorityOrder(matches, count)
    const slots: KoSlot[] = ordered.map((match, index) => {
      const p = match ? proj.get(match.id) : undefined
      return { match, round: slug, index, projHome: p?.home ?? null, projAway: p?.away ?? null }
    })
    const points = matches.reduce((n, m) => n + (m.myPrediction?.pointsEarned?.total ?? 0), 0)
    return { slug, name: ROUND_LONG[slug], short: ROUND_SHORT[slug], slots, points }
  })
}
