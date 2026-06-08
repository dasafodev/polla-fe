import { describe, it, expect, beforeEach } from 'vitest'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const login = () => post('/auth/login', { credential: makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }) })

beforeEach(async () => { await login() })

describe('GET /scoreboard', () => {
  it('devuelve {updatedAt, data} ordenado, excluye admin, juan antes que maria (desempate)', async () => {
    const body = await (await get('/scoreboard')).json()
    expect(typeof body.updatedAt).toBe('string')
    expect(body.data.some((e: { participant: { id: string } }) => e.participant.id === 'p-admin')).toBe(false)
    const iJuan = body.data.findIndex((e: { participant: { id: string } }) => e.participant.id === 'p-juan')
    const iMaria = body.data.findIndex((e: { participant: { id: string } }) => e.participant.id === 'p-maria')
    expect(iJuan).toBeLessThan(iMaria)
    expect(body.data[0].rank).toBe(1)
    expect(body.data[0].prize).toBe(700000)
  })
})

describe('GET /scoreboard/:id/breakdown', () => {
  it('coherente con el scoreboard (mismo total y prize)', async () => {
    const sb = await (await get('/scoreboard')).json()
    const top = sb.data[0]
    const bd = await (await get(`/scoreboard/${top.participant.id}/breakdown`)).json()
    expect(bd.total).toBe(top.total)
    expect(bd.prize).toBe(top.prize)
    expect(bd.breakdown).toHaveProperty('groups')
    expect(bd.breakdown).toHaveProperty('ko')
  })
  it('404 PARTICIPANT_NOT_FOUND', async () => {
    const res = await get('/scoreboard/nope/breakdown')
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'PARTICIPANT_NOT_FOUND' })
  })
  it('404 PARTICIPANT_NOT_FOUND para el admin (no concursa, excluido del scoreboard)', async () => {
    const res = await get('/scoreboard/p-admin/breakdown')
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'PARTICIPANT_NOT_FOUND' })
  })
})
