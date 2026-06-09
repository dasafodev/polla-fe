import { describe, it, expect } from 'vitest'
import { setNow } from '../../lib/clock'
import { db } from '../db'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const send = (p: string, method: 'POST' | 'PUT', body: unknown) =>
  fetch(URL(p), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const loginAs = (sub: string, name: string) => send('/auth/google', 'POST', { credential: makeFakeIdToken({ sub, email: `${name}@x.com`, name }) })

describe('GET /powerups/predictions/me', () => {
  it('juan (seed) tiene powerups', async () => {
    await loginAs('sub-juan', 'Juan')
    const body = await (await get('/powerups/predictions/me')).json()
    expect(body.darkHorse).toMatchObject({ teamId: 'tA4', isTop8: false })
    expect(body.disappointment).toMatchObject({ teamId: 'tA1', isTop8: true })
  })
  it('luis (sin powerups) → null/null', async () => {
    await loginAs('sub-luis', 'Luis')
    const body = await (await get('/powerups/predictions/me')).json()
    expect(body).toMatchObject({ darkHorse: null, disappointment: null })
  })
})

describe('POST /powerups/predictions', () => {
  it('luis crea powerups válidos → 201', async () => {
    await loginAs('sub-luis', 'Luis')
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ darkHorse: { teamId: 'tB4' }, disappointment: { teamId: 'tB1' } })
  })
  it('juan ya tiene → 409 POWERUPS_ALREADY_EXISTS', async () => {
    await loginAs('sub-juan', 'Juan')
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'POWERUPS_ALREADY_EXISTS' })
  })
  it('400 INVALID_DARK_HORSE si darkHorse es top8', async () => {
    await loginAs('sub-luis', 'Luis')
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tA1', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_DARK_HORSE' })
  })
  it('400 INVALID_DISAPPOINTMENT si disappointment no es top8', async () => {
    await loginAs('sub-luis', 'Luis')
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB4' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_DISAPPOINTMENT' })
  })
  it('423 PREDICTIONS_LOCKED en borde exacto', async () => {
    await loginAs('sub-luis', 'Luis')
    setNow(db.tournamentStartAt)
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(423)
    expect(await res.json()).toMatchObject({ code: 'PREDICTIONS_LOCKED' })
  })
})

describe('PUT /powerups/predictions', () => {
  it('juan edita → 200', async () => {
    await loginAs('sub-juan', 'Juan')
    const res = await send('/powerups/predictions', 'PUT', { darkHorseTeamId: 'tC4', disappointmentTeamId: 'tC1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ darkHorse: { teamId: 'tC4' } })
  })
  it('luis (sin powerups) edita → 404 POWERUPS_NOT_FOUND', async () => {
    await loginAs('sub-luis', 'Luis')
    const res = await send('/powerups/predictions', 'PUT', { darkHorseTeamId: 'tC4', disappointmentTeamId: 'tC1' })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'POWERUPS_NOT_FOUND' })
  })
})

describe('GET /powerups/predictions/friends — gating', () => {
  it('antes del torneo → available:false', async () => {
    await loginAs('sub-juan', 'Juan')
    const body = await (await get('/powerups/predictions/friends')).json()
    expect(body.available).toBe(false)
    expect(body.availableAt).toBe(db.tournamentStartAt)
  })
  it('iniciado → available:true, excluye admin y actual', async () => {
    await loginAs('sub-juan', 'Juan')
    setNow(db.tournamentStartAt)
    const body = await (await get('/powerups/predictions/friends')).json()
    expect(body.available).toBe(true)
    const ids = body.data.map((d: { participant: { id: string } }) => d.participant.id)
    expect(ids).not.toContain('p-juan')
    expect(ids).not.toContain('p-admin')
  })
})
