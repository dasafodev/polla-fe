import type { Role } from '../types/enums'

export interface DbParticipant {
  id: string
  googleSub: string
  name: string
  email: string
  phone: string | null
  role: Role
}

export interface DbInvitation {
  id: string
  code: string
  usedByParticipantId: string | null
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

export interface Db {
  currentSessionId: string | null // puntero único de sesión activa (§9.5)
  participants: DbParticipant[]
  invitations: DbInvitation[]
  tournamentStartAt: string // = candado de grupos = scheduledAt del primer partido
}

// Estado mutable compartido por los handlers. Se reemplaza con resetDb().
export let db: Db = makeEmptyDb()

function makeEmptyDb(): Db {
  return { currentSessionId: null, participants: [], invitations: [], tournamentStartAt: '2026-06-11T16:00:00.000Z' }
}

export function setDb(next: Db): void {
  db = next
}
