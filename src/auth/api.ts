import { request } from '../lib/apiClient'
import { roleToFrontend } from '../lib/contract'
import type { ParticipantMe, LoginBody, SignupBody } from '../types/api'

// El backend serializa el role como enum Prisma en MAYÚSCULAS; lo normalizamos a la forma del FE.
function normalize(p: ParticipantMe): ParticipantMe {
  return { ...p, role: roleToFrontend(p.role) }
}

// Login y signup comparten endpoint en el backend real: POST /auth/google.
// Sin code/phone → login (o 403 NEEDS_SIGNUP si el usuario no existe).
// Con code+phone → signup (crea el participante usando el código de invitación).
export const postLogin = (body: LoginBody) =>
  request<ParticipantMe>('POST', '/auth/google', { body }).then(normalize)

export const postSignup = (body: SignupBody) =>
  request<ParticipantMe>('POST', '/auth/google', { body }).then(normalize)

export const postLogout = () => request<void>('POST', '/auth/logout', { body: {} })
