import { describe, it, expect } from 'vitest'
import { makeFakeIdToken } from '../jwt'
import { db } from '../db'

const URL = (p: string) => `http://localhost/api${p}`
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })

const juanCred = () => makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' })
const newCred = () => makeFakeIdToken({ sub: 'sub-nuevo', email: 'nuevo@gmail.com', name: 'Nuevo' })

// POST /auth/google es login+signup unificado (contrato del backend real).
describe('POST /auth/google — login (sin code/phone)', () => {
  it('200 + sesión para usuario existente; role en MAYÚSCULAS (enum Prisma)', async () => {
    const res = await post('/auth/google', { credential: juanCred() })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 'p-juan', role: 'PARTICIPANT' })
    expect(db.currentSessionId).toBe('p-juan')
  })
  it('403 NEEDS_SIGNUP si el usuario no está inscrito', async () => {
    const res = await post('/auth/google', { credential: newCred() })
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'NEEDS_SIGNUP' })
  })
  it('401 INVALID_CREDENTIAL si el credential expiró', async () => {
    const expired = makeFakeIdToken({ sub: 'sub-nuevo', email: 'n@x.com', name: 'N', exp: Math.floor(Date.parse('2026-06-06T11:00:00.000Z') / 1000) })
    const res = await post('/auth/google', { credential: expired })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ code: 'INVALID_CREDENTIAL' })
  })
})

describe('POST /auth/google — signup (con code+phone)', () => {
  it('crea usuario con código disponible, marca usado y abre sesión', async () => {
    const res = await post('/auth/google', { credential: newCred(), code: 'OK1234', phone: '+573009998877' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ email: 'nuevo@gmail.com', role: 'PARTICIPANT' })
    // segunda vez con el mismo código → ya usado
    const again = await post('/auth/google', { credential: makeFakeIdToken({ sub: 's2', email: 'e2@x.com', name: 'E2' }), code: 'OK1234', phone: '+573009998800' })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ code: 'INVITE_USED_OR_EXPIRED' })
  })
  it('404 INVITE_NOT_FOUND con código inexistente', async () => {
    const res = await post('/auth/google', { credential: newCred(), code: 'NOPE00', phone: '+573009998877' })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'INVITE_NOT_FOUND' })
  })
  it('409 INVITE_EXPIRED con código vencido', async () => {
    const res = await post('/auth/google', { credential: newCred(), code: 'EXP000', phone: '+573009998877' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'INVITE_EXPIRED' })
  })
  it('200 (login) si la identidad ya existe, ignorando code/phone', async () => {
    const res = await post('/auth/google', { credential: juanCred(), code: 'OK1234', phone: '+573009998877' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 'p-juan' })
  })
  it('400 INVALID_PHONE con teléfono mal formado', async () => {
    const res = await post('/auth/google', { credential: newCred(), code: 'OK1234', phone: '3009998877' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_PHONE' })
  })
})

describe('POST /auth/logout', () => {
  it('cierra la sesión (200)', async () => {
    await post('/auth/google', { credential: juanCred() })
    expect(db.currentSessionId).toBe('p-juan')
    const out = await post('/auth/logout', {})
    expect(out.status).toBe(200)
    expect(db.currentSessionId).toBeNull()
  })
})
