import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const login = () => post('/auth/google', { credential: makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }) })

beforeEach(async () => { await login() })

describe('GET /groups/matches', () => {
  it('sin filtros devuelve todos los partidos de grupos ordenados por fecha', async () => {
    const { data } = await (await get('/groups/matches')).json()
    expect(data).toHaveLength(6)
    expect(data[0].id).toBe('gm-a1')
    expect(data[0].status).toBe('FINISHED') // contrato real: MAYÚSCULAS
    expect(data[0].groupLabel).toBe('A')
    expect(data[0].homeTeam.code).toBe('A1')
  })
  it('?date filtra por día calendario de Colombia (incluye los de 00:30Z del día siguiente)', async () => {
    const { data } = await (await get('/groups/matches?date=2026-06-12')).json()
    expect(data.map((m: { id: string }) => m.id)).toEqual(['gm-b1', 'gm-b2', 'gm-c1'])
  })
  it('?date=2026-06-11 devuelve solo el día inaugural', async () => {
    const { data } = await (await get('/groups/matches?date=2026-06-11')).json()
    expect(data).toHaveLength(2)
  })
  it('?groupId filtra por grupo', async () => {
    const { data } = await (await get('/groups/matches?groupId=g-B')).json()
    expect(data.map((m: { id: string }) => m.id)).toEqual(['gm-b1', 'gm-b2'])
  })
  it('fecha mal formada → 400 INVALID_DATE', async () => {
    const res = await get('/groups/matches?date=12-06-2026')
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_DATE' })
  })
  it('sin sesión → 401', async () => {
    db.currentSessionId = null
    const res = await get('/groups/matches')
    expect(res.status).toBe(401)
  })
})
