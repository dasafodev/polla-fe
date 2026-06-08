import { request } from '../../lib/apiClient'
import type { Scoreboard, ScoreBreakdown } from '../../types/api'

export const getScoreboard = () => request<Scoreboard>('GET', '/scoreboard')
export const getBreakdown = (participantId: string) => request<ScoreBreakdown>('GET', `/scoreboard/${participantId}/breakdown`)
