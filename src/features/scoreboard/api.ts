import { request } from '../../lib/apiClient'
import type { Scoreboard, ScoreBreakdown } from '../../types/api'

// limit=all: el backend devuelve la tabla completa (todos los jugadores), no solo el top 10.
export const getScoreboard = () => request<Scoreboard>('GET', '/scoreboard', { query: { limit: 'all' } })
export const getBreakdown = (participantId: string) => request<ScoreBreakdown>('GET', `/scoreboard/${participantId}/breakdown`)
