import { HttpResponse } from 'msw'
import { db, type DbParticipant } from '../db'
import type { ErrorCode } from '../../types/enums'
import { now } from '../../lib/clock'

export const err = (code: ErrorCode, error: string, status: number) => HttpResponse.json({ error, code }, { status })

type SessionResult = { participant: DbParticipant; response?: undefined } | { participant?: undefined; response: Response }

/** Resuelve el participante de la sesión activa (§9.5) o un 401 listo para retornar. */
export function requireSession(): SessionResult {
  if (!db.currentSessionId) return { response: err('UNAUTHORIZED', 'No autorizado', 401) }
  const participant = db.participants.find((p) => p.id === db.currentSessionId)
  if (!participant) return { response: err('UNAUTHORIZED', 'No autorizado', 401) }
  return { participant }
}

/** Candado global de grupos/terceros/powerups: cerrado cuando now() >= tournamentStartAt. */
export function groupsLocked(): boolean {
  return now() >= Date.parse(db.tournamentStartAt)
}
