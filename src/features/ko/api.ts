import { request } from '../../lib/apiClient'
import type { KoMatchesResponse, KoMatch, SaveKoPredictionBody, SaveKoPredictionResponse, FriendsKo } from '../../types/api'
import type { RoundSlug } from '../../types/enums'

export const getKoMatches = (round: RoundSlug) => request<KoMatchesResponse>('GET', '/ko/matches', { query: { roundSlug: round } })
export const getKoMatch = (id: string) => request<KoMatch>('GET', `/ko/matches/${id}`)
export const createKoPrediction = (id: string, body: SaveKoPredictionBody) => request<SaveKoPredictionResponse>('POST', `/ko/matches/${id}/predictions`, { body })
export const updateKoPrediction = (id: string, body: SaveKoPredictionBody) => request<SaveKoPredictionResponse>('PUT', `/ko/matches/${id}/predictions`, { body })
export const getFriendsKo = (id: string) => request<FriendsKo>('GET', `/ko/matches/${id}/predictions/friends`)
