// Modo Colombia — lógica pura del takeover del Inicio cuando juega Colombia.
// Aislada para testear sin render. Se deriva de las rondas KO (useAllKoPredictions) + la fecha de hoy
// en Bogotá. Estamos en eliminatorias, así que no hay empates: cada partido resuelve a ganó/perdió.

import { ROUND_LONG } from '../../ko/koView'
import { bogotaDateOf } from '../../../lib/clock'
import type { KoMatch, KoMatchesResponse, KoTeam } from '../../../types/api'

export const COLOMBIA_CODE = 'COL'

export type ColombiaPhase = 'countdown' | 'live' | 'won'

export interface ColombiaTakeover {
  phase: ColombiaPhase
  match: KoMatch
  roundLong: string
  colombia: KoTeam
  opponent: KoTeam
  kickoffAt: string
  score: { col: number; opp: number } | null
}

export function isColombiaMatch(m: KoMatch): boolean {
  return m.homeTeam?.code === COLOMBIA_CODE || m.awayTeam?.code === COLOMBIA_CODE
}

function scoreOf(m: KoMatch, colIsHome: boolean): { col: number; opp: number } | null {
  if (!m.result) return null
  const { scoreHome, scoreAway } = m.result
  return colIsHome ? { col: scoreHome, opp: scoreAway } : { col: scoreAway, opp: scoreHome }
}

export function deriveColombiaTakeover(input: {
  rounds: KoMatchesResponse[]
  today: string
}): ColombiaTakeover | null {
  for (const r of input.rounds) {
    for (const m of r.matches) {
      if (bogotaDateOf(m.scheduledAt) !== input.today) continue
      const colIsHome = m.homeTeam?.code === COLOMBIA_CODE
      const colIsAway = m.awayTeam?.code === COLOMBIA_CODE
      if (!colIsHome && !colIsAway) continue

      const colombia = (colIsHome ? m.homeTeam : m.awayTeam)!
      const opponent = (colIsHome ? m.awayTeam : m.homeTeam)!
      const roundLong = ROUND_LONG[r.round.slug]

      if (m.status === 'finished') {
        // Sin estado de derrota: si Colombia no ganó, no hay takeover (Inicio normal).
        if (!m.result || m.result.winnerTeamId !== colombia.id) return null
        return {
          phase: 'won', match: m, roundLong, colombia, opponent,
          kickoffAt: m.scheduledAt, score: scoreOf(m, colIsHome),
        }
      }

      const phase: ColombiaPhase = m.status === 'live' ? 'live' : 'countdown'
      return {
        phase, match: m, roundLong, colombia, opponent,
        kickoffAt: m.scheduledAt, score: phase === 'live' ? scoreOf(m, colIsHome) : null,
      }
    }
  }
  return null
}
