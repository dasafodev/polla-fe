import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { decodeIdToken } from '../jwt'
import { now } from '../../lib/clock'
import { err } from './_shared'
import type { ParticipantMe } from '../../types/api'

const E164 = /^\+[1-9]\d{7,14}$/

function toMe(pId: string): ParticipantMe {
  const p = db.participants.find((x) => x.id === pId)!
  return { id: p.id, name: p.name, email: p.email, role: p.role }
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { credential } = (await request.json()) as { credential: string }
    const payload = decodeIdToken(credential)
    if (!payload) return err('INVALID_GOOGLE_TOKEN', 'Token de Google inválido', 401)
    const p = db.participants.find((x) => x.googleSub === payload.sub)
    if (!p) return err('USER_NOT_FOUND', 'Necesitas invitación', 404)
    db.currentSessionId = p.id
    return HttpResponse.json(toMe(p.id), { status: 200 })
  }),

  http.post('/api/auth/signup', async ({ request }) => {
    const { credential, code, phone } = (await request.json()) as { credential: string; code: string; phone: string }
    const payload = decodeIdToken(credential)
    if (!payload) return err('INVALID_GOOGLE_TOKEN', 'Token de Google inválido', 401)
    if (payload.exp && payload.exp * 1000 < now()) return err('INVALID_GOOGLE_TOKEN', 'Token de Google expirado', 401)

    const inv = db.invitations.find((i) => i.code === code)
    if (!inv) return err('INVITE_NOT_FOUND', 'Código no encontrado', 404)
    if (inv.usedByParticipantId) return err('INVITE_ALREADY_USED', 'Código ya utilizado', 409)
    if (Date.parse(inv.expiresAt) < now()) return err('INVITE_EXPIRED', 'Código expirado', 409)
    if (!E164.test(phone)) return err('INVALID_PHONE', 'Formato inválido. Usa E.164 ej: +573001234567', 400)
    if (db.participants.some((x) => x.googleSub === payload.sub)) return err('USER_ALREADY_EXISTS', 'Ya existe una cuenta', 409)

    const id = `p-${payload.sub}`
    db.participants.push({ id, googleSub: payload.sub, name: payload.name, email: payload.email, phone, role: 'participant' })
    inv.usedByParticipantId = id
    inv.usedAt = new Date(now()).toISOString()
    db.currentSessionId = id
    return HttpResponse.json(toMe(id), { status: 201 })
  }),

  http.post('/api/auth/logout', async () => {
    db.currentSessionId = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/me', async () => {
    if (!db.currentSessionId) return err('UNAUTHORIZED', 'No autorizado', 401)
    return HttpResponse.json(toMe(db.currentSessionId), { status: 200 })
  }),
]
