import type { KoMatch, KoMatchesResponse, KoSource, KoTeam } from '../../types/api'
import { ROUND_SLUGS, type RoundSlug } from '../../types/enums'
import { MAX_TRIPLES } from '../../lib/constants'

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
// El backend ya expone homeTeamLabel/awayTeamLabel también en producción (cae a "Por definir" solo si
// el partido aún no tiene rótulo cargado).
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

// "Triple o nada" tiene tope global (MAX_TRIPLES) por participante. Se cuenta sobre TODAS las rondas.
export function tripleUsesRemaining(rounds: KoMatchesResponse[]): number {
  const used = rounds.reduce(
    (n, r) => n + r.matches.filter((m) => m.myPrediction?.tripleActive).length,
    0,
  )
  return Math.max(0, MAX_TRIPLES - used)
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
  // Equipos PROYECTADOS para un cruce aún sin definir oficialmente: el ganador (o perdedor, en el 3er
  // puesto) del partido alimentador "sube" a su cupo para que la llave se arme a medida que se juegan
  // los partidos. Es solo visual (el backend todavía no cargó homeTeam/awayTeam), así que el cruce no
  // se vuelve pronosticable.
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

// Equipo ganador (objeto) de un partido ya resuelto, o null si todavía no hay resultado.
function winnerTeam(m: KoMatch): KoTeam | null {
  const id = m.result?.winnerTeamId
  if (!id) return null
  if (m.homeTeam?.id === id) return m.homeTeam
  if (m.awayTeam?.id === id) return m.awayTeam
  return null
}

// Equipo perdedor (objeto): el lado que NO es el ganador. Lo usa el 3er puesto, que se nutre de los
// PERDEDORES de las semis (homeSource/awaySource con outcome LOSER).
function loserTeam(m: KoMatch): KoTeam | null {
  const id = m.result?.winnerTeamId
  if (!id) return null
  if (m.homeTeam?.id === id) return m.awayTeam ?? null
  if (m.awayTeam?.id === id) return m.homeTeam ?? null
  return null
}

// Equipo proyectado para un cupo desde su alimentador (homeSource/awaySource): el ganador —o perdedor,
// en el 3er puesto— del partido fuente, una vez ese partido tenga resultado.
function teamFromSource(src: KoSource | null, byId: Map<string, KoMatch>): KoTeam | null {
  if (!src) return null
  const feeder = byId.get(src.matchId)
  if (!feeder) return null
  return src.outcome === 'LOSER' ? loserTeam(feeder) : winnerTeam(feeder)
}

// Proyección de cruces: a medida que se juegan los partidos, el ganador (o perdedor, en el 3er puesto)
// "sube" al cupo que alimenta en la siguiente ronda, siguiendo homeSource/awaySource del backend
// (BRACKET_FEEDERS). Es la fuente de verdad del cuadro real del Mundial 2026, que NO es binario-
// adyacente (p. ej. el partido 89 lo alimentan el 74 y el 77, no 73/74) y usa matchNumber GLOBAL
// (1–104). Solo proyectamos lados que aún NO tienen equipo oficial (no se pisa lo que cargó el backend).
function buildProjection(rounds: KoMatchesResponse[]): Map<string, { home: KoTeam | null; away: KoTeam | null }> {
  const byId = new Map<string, KoMatch>()
  for (const r of rounds) for (const m of r.matches) byId.set(m.id, m)

  const proj = new Map<string, { home: KoTeam | null; away: KoTeam | null }>()
  for (const r of rounds) {
    for (const m of r.matches) {
      if (m.homeTeam && m.awayTeam) continue // cruce ya oficial → nada que proyectar
      const home = m.homeTeam ? null : teamFromSource(m.homeSource, byId)
      const away = m.awayTeam ? null : teamFromSource(m.awaySource, byId)
      if (home || away) proj.set(m.id, { home, away })
    }
  }
  return proj
}

// ── Orden del árbol (vista Llaves) ────────────────────────────────────────────
// El árbol de ganadores (r32→…→final) se ordena para que los dos alimentadores de cada partido caigan
// en las posiciones 2i y 2i+1 de la ronda anterior; así los conectores del bracket (geometría por CSS
// en KoBracketView) caen exactos sin medir el DOM. El orden se deriva top-down desde la ronda más
// avanzada que ya tenga partidos cargados: esa se ordena por matchNumber (bracketOrder) y cada ronda
// previa se expande siguiendo homeSource/awaySource. Sin alimentadores cableados degrada a bracketOrder
// (orden por matchNumber), que es lo que se renderiza hasta que el backend corra linkBracketFeeders.
const TREE_ROOT_TO_LEAF: RoundSlug[] = ['final', 'sf', 'qf', 'r16', 'r32']

// Desde el orden de una ronda, deriva el de la ronda que la alimenta: por cada partido, su alimentador
// local va antes que el visitante (posiciones 2i, 2i+1). Cupos sin partido/sin fuente quedan en null.
function expandFeederOrder(parent: (KoMatch | null)[], byId: Map<string, KoMatch>): (KoMatch | null)[] {
  const child: (KoMatch | null)[] = []
  for (const p of parent) {
    child.push(p?.homeSource ? byId.get(p.homeSource.matchId) ?? null : null)
    child.push(p?.awaySource ? byId.get(p.awaySource.matchId) ?? null : null)
  }
  return child
}

// Coloca los partidos de una ronda: respeta las posiciones derivadas de los alimentadores y mete los
// partidos no ubicados (alimentador aún sin cargar) en el primer hueco libre, por matchNumber.
function fillFromDerived(derived: (KoMatch | null)[], matches: KoMatch[], count: number): (KoMatch | null)[] {
  const slots: (KoMatch | null)[] = derived.slice(0, count)
  while (slots.length < count) slots.push(null)
  const placed = new Set(slots.filter((m): m is KoMatch => m != null).map((m) => m.id))
  const leftover = matches.filter((m) => !placed.has(m.id)).sort((a, b) => a.matchNumber - b.matchNumber)
  let k = 0
  for (const m of leftover) {
    while (k < slots.length && slots[k] !== null) k++
    if (k < slots.length) slots[k] = m
    else slots.push(m)
  }
  return slots
}

// Orden del árbol de ganadores por ronda (excluye 3er puesto, que no forma parte del árbol).
function buildTreeOrder(rounds: KoMatchesResponse[]): Map<RoundSlug, (KoMatch | null)[]> {
  const byId = new Map<string, KoMatch>()
  const bySlug = new Map<RoundSlug, KoMatch[]>()
  for (const r of rounds) {
    bySlug.set(r.round.slug, r.matches)
    for (const m of r.matches) byId.set(m.id, m)
  }
  const countFor = (slug: RoundSlug) => Math.max(KO_MATCH_COUNTS[slug], (bySlug.get(slug) ?? []).length)
  // Raíz = ronda más avanzada (hacia la final) que ya tenga partidos cargados.
  const rootIdx = TREE_ROOT_TO_LEAF.findIndex((slug) => (bySlug.get(slug) ?? []).length > 0)

  const orders = new Map<RoundSlug, (KoMatch | null)[]>()
  for (let i = 0; i < TREE_ROOT_TO_LEAF.length; i++) {
    const slug = TREE_ROOT_TO_LEAF[i]
    if (rootIdx === -1 || i < rootIdx) {
      orders.set(slug, Array.from({ length: countFor(slug) }, () => null))
    } else if (i === rootIdx) {
      orders.set(slug, bracketOrder(bySlug.get(slug) ?? [], countFor(slug)))
    } else {
      const derived = expandFeederOrder(orders.get(TREE_ROOT_TO_LEAF[i - 1])!, byId)
      orders.set(slug, fillFromDerived(derived, bySlug.get(slug) ?? [], countFor(slug)))
    }
  }
  return orders
}

// Arma las columnas del cuadro en orden de ronda (R32→Final, con 3er puesto antes de la final),
// rellenando cada ronda con cupos vacíos hasta su conteo fijo para que SIEMPRE se vea el camino
// completo hasta la final, incluso si el backend todavía no cargó esa ronda. `order` define cómo se
// ordena dentro de cada ronda (ver KoColumnOrder). En cualquiera de los dos órdenes, cada cupo trae
// además los equipos proyectados (ganadores de la ronda previa) para los cruces aún sin definir.
export function buildColumns(rounds: KoMatchesResponse[], order: KoColumnOrder = 'priority'): KoColumn[] {
  const bySlug = new Map(rounds.map((r) => [r.round.slug, r]))
  const proj = buildProjection(rounds)
  // En modo Llaves el orden del árbol es cross-ronda (los alimentadores de cada partido definen la
  // posición de la ronda previa); el 3er puesto no está en el árbol → cae a bracketOrder.
  const treeOrder = order === 'bracket' ? buildTreeOrder(rounds) : null
  return ROUND_SLUGS.map((slug) => {
    const matches = bySlug.get(slug)?.matches ?? []
    const count = Math.max(KO_MATCH_COUNTS[slug], matches.length)
    const ordered =
      order === 'bracket'
        ? treeOrder!.get(slug) ?? bracketOrder(matches, count)
        : priorityOrder(matches, count)
    const slots: KoSlot[] = ordered.map((match, index) => {
      const p = match ? proj.get(match.id) : undefined
      return { match, round: slug, index, projHome: p?.home ?? null, projAway: p?.away ?? null }
    })
    const points = matches.reduce((n, m) => n + (m.myPrediction?.pointsEarned?.total ?? 0), 0)
    return { slug, name: ROUND_LONG[slug], short: ROUND_SHORT[slug], slots, points }
  })
}
