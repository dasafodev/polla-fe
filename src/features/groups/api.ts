import { request } from '../../lib/apiClient'
import type {
  Group, MyGroupPredictions, SaveGroupPredictionsBody, ThirdsResponse, SaveThirdsBody, FriendsGroups,
  GroupRanking, GroupPointsEarned, GroupPrediction, ParticipantPredictions,
} from '../../types/api'

// ── Anti-corruption: el backend real usa `predictedPosition` (no `position`) y no envía
// `pts_group_position_partial`. Adaptamos a la forma interna del FE. Tolerante a ambos nombres
// para que los mocks (que ya usan `position`) y el API real funcionen por el mismo camino. ──
interface RawRanking {
  teamId: string; name: string; code: string; isTop8: boolean; flag?: string | null
  predictedPosition?: number; position?: number
  result?: 'exact' | 'partial' | null
}
interface RawPointsEarned {
  pts_group_position_exact: number; pts_group_position_partial?: number
  bonus_group_complete: number; total: number
}
interface RawGroupPrediction {
  groupId: string; label: string; name: string; groupComplete: boolean
  rankings: RawRanking[]; pointsEarned: RawPointsEarned | null
}
interface RawMyGroupPredictions { data: RawGroupPrediction[]; completedGroups: number }
interface RawParticipantPredictions { participant: { id: string; name: string }; predictions: RawGroupPrediction[] }
interface RawFriendsGroups { available: boolean; availableAt?: string | null; data?: RawParticipantPredictions[] | null }

function adaptRanking(r: RawRanking): GroupRanking {
  return { teamId: r.teamId, name: r.name, code: r.code, isTop8: r.isTop8, flag: r.flag ?? null, position: r.predictedPosition ?? r.position ?? 0, result: r.result ?? null }
}
function adaptPoints(p: RawPointsEarned | null): GroupPointsEarned | null {
  if (!p) return null
  return {
    pts_group_position_exact: p.pts_group_position_exact,
    pts_group_position_partial: p.pts_group_position_partial ?? 0,
    bonus_group_complete: p.bonus_group_complete,
    total: p.total,
  }
}
function adaptGroupPrediction(g: RawGroupPrediction): GroupPrediction {
  return {
    groupId: g.groupId, label: g.label, name: g.name, groupComplete: g.groupComplete,
    rankings: g.rankings.map(adaptRanking), pointsEarned: adaptPoints(g.pointsEarned),
  }
}

export function adaptMyGroupPredictions(raw: RawMyGroupPredictions): MyGroupPredictions {
  return { data: raw.data.map(adaptGroupPrediction), completedGroups: raw.completedGroups }
}
export function adaptFriendsGroups(raw: RawFriendsGroups): FriendsGroups {
  const data: ParticipantPredictions[] | undefined = raw.data?.map((pp) => ({
    participant: pp.participant,
    predictions: pp.predictions.map(adaptGroupPrediction),
  }))
  return { available: raw.available, availableAt: raw.availableAt ?? undefined, data }
}

export const getGroups = () => request<{ data: Group[] }>('GET', '/groups')
export const getMyGroupPredictions = () =>
  request<RawMyGroupPredictions>('GET', '/groups/predictions/me').then(adaptMyGroupPredictions)
export const saveGroupPredictions = (body: SaveGroupPredictionsBody) =>
  request<{ ok: boolean; savedGroups: number }>('POST', '/groups/predictions', { body })
export const getThirds = () => request<ThirdsResponse>('GET', '/groups/thirds')
export const saveThirds = (body: SaveThirdsBody) => request<{ ok: boolean; selectedCount: number }>('POST', '/groups/thirds', { body })
export const getFriendsGroups = () =>
  request<RawFriendsGroups>('GET', '/groups/predictions/friends').then(adaptFriendsGroups)
