import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { server } from '../server'
import { resetDb } from '../seed'
import { setNow, resetClock } from '../../lib/clock'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => { resetDb(); resetClock(); setNow('2026-06-06T12:00:00.000Z'); server.resetHandlers() })

const juanCred = () => makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' })
const newCred = () => makeFakeIdToken({ sub: 'sub-nuevo', email: 'nuevo@gmail.com', name: 'Nuevo' })

describe('POST /auth/login', () => {
  it('200 + sesión para usuario existente', async () => {
    const res = await post('/auth/login', { credential: juanCred() })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 'p-juan', role: 'participant' })
    const me = await fetch(URL('/me'), { credentials: 'include' })
    expect(me.status).toBe(200)
  })
  it('404 USER_NOT_FOUND si no existe', async () => {
    const res = await post('/auth/login', { credential: newCred() })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'USER_NOT_FOUND' })
  })
})

describe('POST /auth/signup', () => {
  it('crea usuario con código disponible, marca usado y abre sesión', async () => {
    const res = await post('/auth/signup', { credential: newCred(), code: 'OK1234', phone: '+573009998877' })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ email: 'nuevo@gmail.com', role: 'participant' })
    // segunda vez con el mismo código → ya usado
    const again = await post('/auth/signup', { credential: makeFakeIdToken({ sub: 's2', email: 'e2@x.com', name: 'E2' }), code: 'OK1234', phone: '+573009998800' })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ code: 'INVITE_ALREADY_USED' })
  })
  it('404 INVITE_NOT_FOUND con código inexistente', async () => {
    const res = await post('/auth/signup', { credential: newCred(), code: 'NOPE00', phone: '+573009998877' })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'INVITE_NOT_FOUND' })
  })
  it('409 INVITE_EXPIRED con código vencido', async () => {
    const res = await post('/auth/signup', { credential: newCred(), code: 'EXP000', phone: '+573009998877' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'INVITE_EXPIRED' })
  })
  it('409 USER_ALREADY_EXISTS si la identidad ya existe', async () => {
    const res = await post('/auth/signup', { credential: juanCred(), code: 'OK1234', phone: '+573009998877' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'USER_ALREADY_EXISTS' })
  })
  it('400 INVALID_PHONE con teléfono mal formado', async () => {
    const res = await post('/auth/signup', { credential: newCred(), code: 'OK1234', phone: '3009998877' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_PHONE' })
  })
  it('401 INVALID_GOOGLE_TOKEN si el credential expiró', async () => {
    const expired = makeFakeIdToken({ sub: 'sub-nuevo', email: 'n@x.com', name: 'N', exp: Math.floor(Date.parse('2026-06-06T11:00:00.000Z') / 1000) })
    const res = await post('/auth/signup', { credential: expired, code: 'OK1234', phone: '+573009998877' })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ code: 'INVALID_GOOGLE_TOKEN' })
  })
})

describe('GET /me + logout', () => {
  it('401 sin sesión', async () => {
    const res = await fetch(URL('/me'), { credentials: 'include' })
    expect(res.status).toBe(401)
  })
  it('logout cierra la sesión', async () => {
    await post('/auth/login', { credential: juanCred() })
    const out = await post('/auth/logout', {})
    expect(out.status).toBe(204)
    const me = await fetch(URL('/me'), { credentials: 'include' })
    expect(me.status).toBe(401)
  })
})
