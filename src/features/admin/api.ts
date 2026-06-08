import { request } from '../../lib/apiClient'
import type { AdminParticipantsResponse } from '../../types/api'

export const getAdminParticipants = () => request<AdminParticipantsResponse>('GET', '/admin/participants')
