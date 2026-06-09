import { ApiError } from '../lib/errors'
import type { ParticipantMe } from '../types/api'

// El API real (congelado) no expone GET /me y la cookie de sesión es HttpOnly (JS no la lee).
// Para restaurar la identidad tras un reload cacheamos el participante (id/name/email/role) en
// localStorage. NO guardamos el credential/token de Google: la autenticación sigue viviendo en la
// cookie HttpOnly; esto es sólo identidad para pintar la UI. Un 401 del API real limpia este cache.
const KEY = 'polla.participant'

export function loadSession(): ParticipantMe | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ParticipantMe) : null
  } catch {
    return null
  }
}

export function saveSession(participant: ParticipantMe): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(participant))
  } catch {
    // storage lleno o no disponible: la sesión sigue en memoria hasta el próximo reload.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // noop
  }
}

/** queryFn de la query `me`: identidad cacheada o 401 (sin red). */
export async function getSession(): Promise<ParticipantMe> {
  const participant = loadSession()
  if (!participant) throw new ApiError('UNAUTHORIZED', 'No autorizado', 401)
  return participant
}
