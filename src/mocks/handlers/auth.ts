import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { decodeIdToken } from '../jwt'
import { now } from '../../lib/clock'
import { err } from './_shared'

const E164 = /^\+[1-9]\d{7,14}$/

// El backend serializa role como enum Prisma en MAYÚSCULAS. El FE lo normaliza en auth/api.ts.
function toMe(pId: string) {
  const p = db.participants.find((x) => x.id === pId)!
  return { id: p.id, name: p.name, email: p.email, role: p.role.toUpperCase() }
}

// Imita POST /auth/google del backend real (loginOrSignup):
//  - credential inválido/expirado → 401 INVALID_CREDENTIAL
//  - usuario existente → 200 + sesión
//  - usuario nuevo sin code/phone → 403 NEEDS_SIGNUP
//  - usuario nuevo con code+phone válidos → 200 + crea participante + marca invitación usada
export const authHandlers = [
  http.post('/api/auth/google', async ({ request }) => {
    const { credential, code, phone } = (await request.json()) as {
      credential?: string
      code?: string
      phone?: string
    }
    if (!credential) return err('VALIDATION_ERROR', 'credential es requerido', 400)

    const payload = decodeIdToken(credential)
    if (!payload) return err('INVALID_CREDENTIAL', 'Credential de Google inválido o expirado', 401)
    if (payload.exp && payload.exp * 1000 < now()) return err('INVALID_CREDENTIAL', 'Credential de Google inválido o expirado', 401)

    const existing = db.participants.find((x) => x.googleSub === payload.sub)
    if (existing) {
      db.currentSessionId = existing.id
      return HttpResponse.json(toMe(existing.id), { status: 200 })
    }

    // usuario nuevo: requiere código de invitación + teléfono
    if (!code || !phone) return err('NEEDS_SIGNUP', 'Needs an invitation code to register', 403)
    if (!E164.test(phone)) return err('INVALID_PHONE', 'Formato inválido. Usa E.164, ej: +573001234567', 400)

    const inv = db.invitations.find((i) => i.code === code)
    if (!inv) return err('INVITE_NOT_FOUND', 'Código de invitación no encontrado', 404)
    if (inv.usedByParticipantId) return err('INVITE_USED_OR_EXPIRED', 'Código ya utilizado o expirado', 409)
    if (Date.parse(inv.expiresAt) < now()) return err('INVITE_EXPIRED', 'Código expirado', 409)
    if (db.participants.some((x) => x.googleSub === payload.sub)) return err('ALREADY_REGISTERED', 'Ya existe un participante con este Google ID', 409)

    const id = `p-${payload.sub}`
    db.participants.push({ id, googleSub: payload.sub, name: payload.name, email: payload.email, phone, role: 'participant' })
    inv.usedByParticipantId = id
    inv.usedAt = new Date(now()).toISOString()
    db.currentSessionId = id
    return HttpResponse.json(toMe(id), { status: 200 })
  }),

  http.post('/api/auth/logout', async () => {
    db.currentSessionId = null
    return HttpResponse.json({ ok: true }, { status: 200 })
  }),
]
