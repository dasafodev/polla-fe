import { request } from '../../lib/apiClient'
import { roundToBackend, roundToFrontend, statusToFrontend } from '../../lib/contract'
import { now } from '../../lib/clock'
import type { KoMatchesResponse, KoMatch, KoRound, SaveKoPredictionBody, SaveKoPredictionResponse, FriendsKo } from '../../types/api'
import type { RoundSlug } from '../../types/enums'

// ── Anti-corruption: el backend serializa los enums de Prisma en MAYÚSCULAS (status, round.slug),
// externalMatchId puede venir null y NO envía `locked` a nivel de partido (solo lockedAt). Adaptamos
// a la forma del FE: derivamos `locked` comparando lockedAt contra el reloj (igual que el lockedIn
// que el backend calcula internamente). ──
type RawKoMatch = Omit<KoMatch, 'status' | 'externalMatchId' | 'locked'> & { status: string; externalMatchId: number | null }
type RawKoRound = Omit<KoRound, 'slug'> & { slug: string }
interface RawKoMatchesResponse { round: RawKoRound; matches: RawKoMatch[] }

export function adaptKoMatch(m: RawKoMatch): KoMatch {
  return {
    ...m,
    status: statusToFrontend(m.status),
    externalMatchId: m.externalMatchId ?? 0,
    locked: now() >= Date.parse(m.lockedAt),
  }
}
export function adaptKoMatchesResponse(raw: RawKoMatchesResponse): KoMatchesResponse {
  return {
    round: { ...raw.round, slug: roundToFrontend(raw.round.slug) },
    matches: raw.matches.map(adaptKoMatch),
  }
}

// El backend valida roundSlug en MAYÚSCULAS (R32…FINAL, THIRD); el FE usa r32…final/3rd.
export const getKoMatches = (round: RoundSlug) =>
  request<RawKoMatchesResponse>('GET', '/ko/matches', { query: { roundSlug: roundToBackend(round) } }).then(adaptKoMatchesResponse)
export const getKoMatch = (id: string) =>
  request<RawKoMatch>('GET', `/ko/matches/${id}`).then(adaptKoMatch)
export const createKoPrediction = (id: string, body: SaveKoPredictionBody) =>
  request<SaveKoPredictionResponse>('POST', `/ko/matches/${id}/predictions`, { body })
export const updateKoPrediction = (id: string, body: SaveKoPredictionBody) =>
  request<SaveKoPredictionResponse>('PUT', `/ko/matches/${id}/predictions`, { body })
export const getFriendsKo = (id: string) => request<FriendsKo>('GET', `/ko/matches/${id}/predictions/friends`)
