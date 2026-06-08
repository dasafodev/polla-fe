import { describe, it, expect, beforeEach } from 'vitest'
import { setNow } from '../../lib/clock'
import { db } from '../db'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const login = () => post('/auth/login', { credential: makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }) })
const rankingsFor = (order: string[]) => order.map((teamId, i) => ({ teamId, position: i + 1 }))

beforeEach(async () => { await login() })

describe('GET /groups', () => {
  it('devuelve los 12 grupos con 4 equipos', async () => {
    const { data } = await (await get('/groups')).json()
    expect(data).toHaveLength(12)
    expect(data[0].teams).toHaveLength(4)
  })
})

describe('candado de grupos — borde exacto (§9.4)', () => {
  it('now == tournamentStartAt → 423 PREDICTIONS_LOCKED', async () => {
    setNow(db.tournamentStartAt)
    const g = db.groups[0]
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: rankingsFor(g.teamIds) }] })
    expect(res.status).toBe(423)
    expect(await res.json()).toMatchObject({ code: 'PREDICTIONS_LOCKED' })
  })
  it('1ms antes → guarda (200)', async () => {
    setNow(new Date(Date.parse(db.tournamentStartAt) - 1).toISOString())
    const g = db.groups[0]
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: rankingsFor(g.teamIds) }] })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, savedGroups: 1 })
  })
})

describe('validación de rankings', () => {
  it('400 INVALID_RANKINGS con posición duplicada', async () => {
    const g = db.groups[0]
    const bad = [
      { teamId: g.teamIds[0], position: 1 }, { teamId: g.teamIds[1], position: 1 },
      { teamId: g.teamIds[2], position: 3 }, { teamId: g.teamIds[3], position: 4 },
    ]
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: bad }] })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_RANKINGS' })
  })
  it('400 INVALID_RANKINGS con teamId ajeno al grupo', async () => {
    const g = db.groups[0]
    const foreign = db.groups[1].teamIds[0]
    const bad = rankingsFor([foreign, g.teamIds[1], g.teamIds[2], g.teamIds[3]])
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: bad }] })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_RANKINGS' })
  })
})

describe('GET /groups/predictions/me', () => {
  it('juan tiene 12 grupos completos', async () => {
    const body = await (await get('/groups/predictions/me')).json()
    expect(body.completedGroups).toBe(12)
    expect(body.data).toHaveLength(12)
    expect(body.data[0].groupComplete).toBe(true)
  })
})

describe('cascada terceros: re-upsert que cambia el 3° lo des-selecciona', () => {
  it('editar grupo cambia el 3° → ese tercero deja de ser candidato y baja selectedCount', async () => {
    const before = await (await get('/groups/thirds')).json()
    expect(before.selectedCount).toBe(8) // seed: 8 seleccionados
    const target = before.data.find((c: { selected: boolean }) => c.selected)
    const g = db.groups.find((x) => x.id === target.groupId)!
    const oldThird = target.teamId
    const newThird = g.teamIds.find((id) => id !== oldThird)!
    const others = g.teamIds.filter((id) => id !== newThird)
    // newThird → posición 3
    const ordered = [others[0], others[1], newThird, others[2]]
    const up = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: rankingsFor(ordered) }] })
    expect(up.status).toBe(200)
    const after = await (await get('/groups/thirds')).json()
    expect(after.data.find((c: { teamId: string }) => c.teamId === oldThird)).toBeUndefined()
    expect(after.selectedCount).toBe(7)
  })
})

describe('POST /groups/thirds', () => {
  it('200 con 8 candidatos válidos', async () => {
    const { data } = await (await get('/groups/thirds')).json()
    const eight = data.slice(0, 8).map((c: { teamId: string }) => c.teamId)
    const res = await post('/groups/thirds', { teamIds: eight })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, selectedCount: 8 })
  })
  it('400 INVALID_THIRDS_COUNT si no son 8', async () => {
    const { data } = await (await get('/groups/thirds')).json()
    const res = await post('/groups/thirds', { teamIds: data.slice(0, 7).map((c: { teamId: string }) => c.teamId) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_THIRDS_COUNT' })
  })
  it('400 INVALID_THIRD_CANDIDATE con teamId no candidato', async () => {
    const res = await post('/groups/thirds', { teamIds: Array.from({ length: 8 }, (_, i) => `nope-${i}`) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_THIRD_CANDIDATE' })
  })
})

describe('GET /groups/predictions/friends — gating', () => {
  it('antes del torneo → available:false + availableAt', async () => {
    const body = await (await get('/groups/predictions/friends')).json()
    expect(body.available).toBe(false)
    expect(body.availableAt).toBe(db.tournamentStartAt)
  })
  it('iniciado el torneo → available:true, excluye admin y al actual', async () => {
    setNow(db.tournamentStartAt)
    const body = await (await get('/groups/predictions/friends')).json()
    expect(body.available).toBe(true)
    const ids = body.data.map((d: { participant: { id: string } }) => d.participant.id)
    expect(ids).not.toContain('p-juan')
    expect(ids).not.toContain('p-admin')
  })
})

describe('POST /groups/predictions — groupId duplicado en el body', () => {
  it('400 INVALID_RANKINGS si se repite un groupId', async () => {
    const g = db.groups[0]
    const r = rankingsFor(g.teamIds)
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: r }, { groupId: g.id, rankings: r }] })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_RANKINGS' })
  })
})
