import type { KoMatch, KoMatchesResponse } from '../../types/api'
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
}

export interface KoColumn {
  slug: RoundSlug
  name: string
  short: string
  slots: KoSlot[]
  // Puntos KO acumulados del usuario en la ronda (solo relevante con la polla cerrada/resuelta).
  points: number
}

// Arma las columnas del cuadro en orden de ronda (R32→Final, con 3er puesto antes de la final),
// rellenando cada ronda con cupos vacíos hasta su conteo fijo para que SIEMPRE se vea el camino
// completo hasta la final, incluso si el backend todavía no cargó esa ronda.
export function buildColumns(rounds: KoMatchesResponse[]): KoColumn[] {
  const bySlug = new Map(rounds.map((r) => [r.round.slug, r]))
  return ROUND_SLUGS.map((slug) => {
    const r = bySlug.get(slug)
    const matches = r ? [...r.matches].sort((a, b) => a.matchNumber - b.matchNumber) : []
    const count = Math.max(KO_MATCH_COUNTS[slug], matches.length)
    const slots: KoSlot[] = []
    for (let i = 0; i < count; i++) {
      slots.push({ match: matches[i] ?? null, round: slug, index: i })
    }
    const points = matches.reduce((n, m) => n + (m.myPrediction?.pointsEarned?.total ?? 0), 0)
    return { slug, name: ROUND_LONG[slug], short: ROUND_SHORT[slug], slots, points }
  })
}
