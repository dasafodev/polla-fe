import { request } from '../../lib/apiClient'
import type {
  Group, MyGroupPredictions, SaveGroupPredictionsBody, ThirdsResponse, SaveThirdsBody, FriendsGroups,
} from '../../types/api'

export const getGroups = () => request<{ data: Group[] }>('GET', '/groups')
export const getMyGroupPredictions = () => request<MyGroupPredictions>('GET', '/groups/predictions/me')
export const saveGroupPredictions = (body: SaveGroupPredictionsBody) =>
  request<{ ok: boolean; savedGroups: number }>('POST', '/groups/predictions', { body })
export const getThirds = () => request<ThirdsResponse>('GET', '/groups/thirds')
export const saveThirds = (body: SaveThirdsBody) => request<{ ok: boolean; selectedCount: number }>('POST', '/groups/thirds', { body })
export const getFriendsGroups = () => request<FriendsGroups>('GET', '/groups/predictions/friends')
