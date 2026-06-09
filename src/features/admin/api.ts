import { request } from '../../lib/apiClient'
import { roleToFrontend } from '../../lib/contract'
import type { AdminParticipantsResponse } from '../../types/api'

// ── Anti-corruption: el backend devuelve `totalScore` (no `total`) y el role como enum Prisma en
// MAYÚSCULAS. Tolerante a ambos nombres para que mocks y API real funcionen igual. ──
interface RawAdminParticipant {
  id: string; name: string; email: string; phone: string | null; role: string
  total?: number; totalScore?: number
}

export function adaptAdminParticipants(raw: { data: RawAdminParticipant[] }): AdminParticipantsResponse {
  return {
    data: raw.data.map((p) => ({
      id: p.id, name: p.name, email: p.email, phone: p.phone,
      role: roleToFrontend(p.role), total: p.totalScore ?? p.total ?? 0,
    })),
  }
}

export const getAdminParticipants = () =>
  request<{ data: RawAdminParticipant[] }>('GET', '/admin/participants').then(adaptAdminParticipants)
