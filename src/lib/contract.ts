import type { RoundSlug, MatchStatus, Role } from '../types/enums'

// El backend serializa los enums de Prisma crudos en MAYÚSCULAS (R32, SCHEDULED, PARTICIPANT)
// y usa THIRD donde el FE usa '3rd'. Estas funciones traducen en la frontera del cliente API.

export function roundToBackend(slug: RoundSlug): string {
  return slug === '3rd' ? 'THIRD' : slug.toUpperCase()
}

export function roundToFrontend(slug: string): RoundSlug {
  return (slug.toUpperCase() === 'THIRD' ? '3rd' : slug.toLowerCase()) as RoundSlug
}

export function statusToFrontend(status: string): MatchStatus {
  return status.toLowerCase() as MatchStatus
}

export function roleToFrontend(role: string): Role {
  return role.toLowerCase() as Role
}
