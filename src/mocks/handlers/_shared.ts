import { HttpResponse } from 'msw'
import { db, type DbParticipant } from '../db'
import type { ErrorCode } from '../../types/enums'
import { now } from '../../lib/clock'

// El backend real responde { code, message }. El apiClient lee ambos campos, pero los mocks imitan
// el contrato real para que los tests ejerciten exactamente el mismo camino que producción.
export const err = (code: ErrorCode, message: string, status: number) => HttpResponse.json({ code, message }, { status })

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
