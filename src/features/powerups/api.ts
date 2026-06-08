import { request } from '../../lib/apiClient'
import type { MyPowerups, SavePowerupsBody, FriendsPowerups } from '../../types/api'

export const getMyPowerups = () => request<MyPowerups>('GET', '/powerups/predictions/me')
export const createPowerups = (body: SavePowerupsBody) => request<MyPowerups>('POST', '/powerups/predictions', { body })
export const updatePowerups = (body: SavePowerupsBody) => request<MyPowerups>('PUT', '/powerups/predictions', { body })
export const getFriendsPowerups = () => request<FriendsPowerups>('GET', '/powerups/predictions/friends')
