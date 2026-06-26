import { request } from '../../lib/apiClient'
import type { Scoreboard, ScoreBreakdown } from '../../types/api'

// Criterio de orden de la tabla (contrato): total = real + simulado; real = solo confirmado.
export type ScoreboardSort = 'total' | 'real' | 'simulated'

// limit=all: el backend devuelve la tabla completa (todos los jugadores), no solo el top 10.
// sortBy define el orden Y el rank: la vista oficial pide 'real' para que el backend reordene
// por puntos confirmados (el desempate por exactos KO solo lo resuelve el backend).
export const getScoreboard = (sortBy: ScoreboardSort = 'total') =>
  request<Scoreboard>('GET', '/scoreboard', { query: { limit: 'all', sortBy } })
export const getBreakdown = (participantId: string) => request<ScoreBreakdown>('GET', `/scoreboard/${participantId}/breakdown`)
