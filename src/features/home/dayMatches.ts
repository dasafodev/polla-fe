import type { GroupMatch, KoMatch } from '../../types/api'
import type { MatchStatus } from '../../types/enums'
import { bogotaDateOf } from '../../lib/clock'

// Pronóstico del usuario para mostrar en la card (solo KO: grupos no tiene pronóstico por partido).
// advancesCode = código del equipo que el usuario marcó como clasificado.
export interface MatchPrediction {
  scoreHome: number
  scoreAway: number
  advancesCode: string | null
}

export interface MatchDisplay {
  id: string
  kind: 'group' | 'ko'
  kicker: string
  label: string
  scheduledAt: string
  status: MatchStatus
  home: { code: string; flag: string | null } | null
  away: { code: string; flag: string | null } | null
  homeLabel: string | null
  awayLabel: string | null
  scoreHome: number | null
  scoreAway: number | null
  prediction: MatchPrediction | null
}

export interface DayMatches {
  matches: MatchDisplay[]
  mode: 'today' | 'next'
}

function kickerForStatus(status: MatchStatus): string {
  if (status === 'live') return 'En juego ahora'
  if (status === 'finished') return 'Finalizado'
  return 'Por jugar'
}

const fromGroup = (m: GroupMatch): MatchDisplay => ({
  id: m.id,
  kind: 'group',
  kicker: kickerForStatus(m.status),
  label: m.groupLabel ? `Grupo ${m.groupLabel}` : 'Fase de grupos',
  scheduledAt: m.scheduledAt, status: m.status,
  home: m.homeTeam, away: m.awayTeam,
  homeLabel: m.homeTeamLabel, awayLabel: m.awayTeamLabel,
  scoreHome: m.scoreHome, scoreAway: m.scoreAway,
  prediction: null,
})

// Código del equipo que el usuario marcó como clasificado (para "pasa COL" en la card).
function advancesCodeOf(m: KoMatch): string | null {
  const id = m.myPrediction?.teamAdvancesId
  if (!id) return null
  if (m.homeTeam?.id === id) return m.homeTeam.code
  if (m.awayTeam?.id === id) return m.awayTeam.code
  return null
}

const fromKo = (m: KoMatch): MatchDisplay => ({
  id: m.id,
  kind: 'ko',
  kicker: kickerForStatus(m.status),
  label: 'Eliminatorias',
  scheduledAt: m.scheduledAt, status: m.status,
  home: m.homeTeam, away: m.awayTeam,
  homeLabel: m.homeTeamLabel, awayLabel: m.awayTeamLabel,
  scoreHome: m.result?.scoreHome ?? null, scoreAway: m.result?.scoreAway ?? null,
  prediction: m.myPrediction
    ? { scoreHome: m.myPrediction.scoreHome, scoreAway: m.myPrediction.scoreAway, advancesCode: advancesCodeOf(m) }
    : null,
})

const byKickoff = (a: MatchDisplay, b: MatchDisplay) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)

// Todos los partidos del día (grupos + KO) en hora Colombia, ordenados por inicio. Si hoy no hay
// partidos, cae al próximo partido programado (futuro). KO sin equipos definidos (TBD) se omite.
export function deriveDayMatches(input: {
  groupMatches: GroupMatch[]
  koMatches: KoMatch[]
  today: string
  now: number
}): DayMatches {
  const all = [
    ...input.groupMatches.map(fromGroup),
    ...input.koMatches.filter((m) => m.homeTeam != null && m.awayTeam != null).map(fromKo),
  ]

  const todays = all.filter((m) => bogotaDateOf(m.scheduledAt) === input.today).sort(byKickoff)
  if (todays.length > 0) return { matches: todays, mode: 'today' }

  const next = all
    .filter((m) => (m.status === 'scheduled' || m.status === 'live') && Date.parse(m.scheduledAt) > input.now)
    .sort(byKickoff)[0]
  if (!next) return { matches: [], mode: 'next' }
  return { matches: [{ ...next, kicker: 'Siguiente partido' }], mode: 'next' }
}
