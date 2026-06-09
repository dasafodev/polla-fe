import { describe, it, expect, beforeEach } from 'vitest'
import { setNow } from '../../lib/clock'
import { db } from '../db'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const send = (p: string, method: 'POST' | 'PUT', body: unknown) =>
  fetch(URL(p), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const loginAs = (sub: string, name: string) => send('/auth/google', 'POST', { credential: makeFakeIdToken({ sub, email: `${name}@x.com`, name }) })
// partidos abiertos: scheduled con homeTeam y lockedAt en el futuro respecto a now de test (2026-06-06)
const openMatches = () => db.koMatches.filter((m) => m.status === 'scheduled' && m.homeTeamId && Date.parse(m.lockedAt) > Date.parse('2026-06-06T12:00:00.000Z'))

beforeEach(async () => { await loginAs('sub-juan', 'Juan') })

describe('GET /ko/matches', () => {
  it('lista r32 con round + matches; 400 si roundSlug inválido', async () => {
    const body = await (await get('/ko/matches?roundSlug=r32')).json()
    expect(body.round.slug).toBe('r32')
    expect(body.matches.length).toBeGreaterThan(0)
    const bad = await get('/ko/matches?roundSlug=zzz')
    expect(bad.status).toBe(400)
    expect(await bad.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
  })
  it('myPrediction.lockedIn refleja now >= lockedAt en partido finished que juan predijo', async () => {
    const body = await (await get('/ko/matches?roundSlug=r32')).json()
    const m = body.matches.find((x: { id: string }) => x.id === 'ko-r32-1')
    expect(m.myPrediction).not.toBeNull()
    expect(m.myPrediction.lockedIn).toBe(true)
    expect(m.myPrediction.pointsEarned).not.toBeNull()
  })
})

describe('GET /ko/matches/:id', () => {
  it('404 MATCH_NOT_FOUND', async () => {
    const res = await get('/ko/matches/nope')
    expect(res.status).toBe(404)
  })
})

describe('MATCH_LOCKED / MATCH_FINISHED', () => {
  it('partido finished → 423 MATCH_FINISHED', async () => {
    const fin = db.koMatches.find((m) => m.status === 'finished')!
    const res = await send(`/ko/matches/${fin.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: fin.homeTeamId })
    expect(res.status).toBe(423)
    expect(await res.json()).toMatchObject({ code: 'MATCH_FINISHED' })
  })
  it('now == lockedAt → 423 MATCH_LOCKED; 1ms antes → 201', async () => {
    const m = openMatches()[0]
    setNow(m.lockedAt)
    let res = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId })
    expect(res.status).toBe(423)
    setNow(new Date(Date.parse(m.lockedAt) - 1).toISOString())
    res = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId })
    expect(res.status).toBe(201)
  })
})

describe('POST validaciones', () => {
  it('400 INVALID_TEAM_ADVANCES', async () => {
    const m = openMatches()[0]
    const res = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: 'ajeno' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_TEAM_ADVANCES' })
  })
  it('409 PREDICTION_ALREADY_EXISTS', async () => {
    const m = openMatches()[0]
    await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId })
    const again = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 2, scoreAway: 2, teamAdvancesId: m.homeTeamId })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ code: 'PREDICTION_ALREADY_EXISTS' })
  })
})

describe('triple — 4 transiciones + tope global 3 (§9.3.1)', () => {
  it('POST con triple consume; 4º triple → 400 TRIPLE_USES_EXHAUSTED', async () => {
    const ms = openMatches()
    for (let i = 0; i < 3; i++) {
      const r = await send(`/ko/matches/${ms[i].id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: ms[i].homeTeamId, tripleActive: true })
      expect(r.status).toBe(201)
      expect((await r.json()).tripleUsesRemaining).toBe(3 - (i + 1))
    }
    const exhausted = await send(`/ko/matches/${ms[3].id}/predictions`, 'POST', { scoreHome: 0, scoreAway: 0, teamAdvancesId: ms[3].homeTeamId, tripleActive: true })
    expect(exhausted.status).toBe(400)
    expect(await exhausted.json()).toMatchObject({ code: 'TRIPLE_USES_EXHAUSTED' })
  })
  it('PUT false→true consume; true→false libera; idempotencias sin cambio', async () => {
    const m = openMatches()[0]
    await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: false })
    let r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: true })
    expect((await r.json()).tripleUsesRemaining).toBe(2)
    r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 2, scoreAway: 1, teamAdvancesId: m.homeTeamId, tripleActive: true })
    expect((await r.json()).tripleUsesRemaining).toBe(2)
    r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 2, scoreAway: 1, teamAdvancesId: m.homeTeamId, tripleActive: false })
    expect((await r.json()).tripleUsesRemaining).toBe(3)
    r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 0, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: false })
    expect((await r.json()).tripleUsesRemaining).toBe(3)
  })
  it('PUT 404 PREDICTION_NOT_FOUND si no existe', async () => {
    const m = openMatches()[2]
    const r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 0, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: false })
    expect(r.status).toBe(404)
    expect(await r.json()).toMatchObject({ code: 'PREDICTION_NOT_FOUND' })
  })
})

describe('friends KO — gating por scheduledAt', () => {
  it('antes de scheduledAt → available:false + availableAt + data:null', async () => {
    const m = openMatches()[0]
    setNow(new Date(Date.parse(m.scheduledAt) - 1000).toISOString())
    const body = await (await get(`/ko/matches/${m.id}/predictions/friends`)).json()
    expect(body).toMatchObject({ available: false, matchId: m.id, availableAt: m.scheduledAt, data: null })
  })
  it('now >= scheduledAt → available:true, excluye admin/actual', async () => {
    const m = openMatches()[0]
    setNow(m.scheduledAt)
    const body = await (await get(`/ko/matches/${m.id}/predictions/friends`)).json()
    expect(body.available).toBe(true)
    const ids = body.data.map((d: { participant: { id: string } }) => d.participant.id)
    expect(ids).not.toContain('p-juan')
    expect(ids).not.toContain('p-admin')
  })
})

describe('validación de marcador', () => {
  it('400 VALIDATION_ERROR con marcador negativo', async () => {
    const m = openMatches()[0]
    const res = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: -1, scoreAway: 0, teamAdvancesId: m.homeTeamId })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
  })
  it('400 VALIDATION_ERROR si falta el marcador', async () => {
    const m = openMatches()[0]
    const res = await send(`/ko/matches/${m.id}/predictions`, 'POST', { teamAdvancesId: m.homeTeamId })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
  })
  it('PUT 400 VALIDATION_ERROR con marcador no entero', async () => {
    const m = openMatches()[0]
    await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId })
    const res = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 1.5, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: false })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})

describe('match.locked (candado a nivel de partido)', () => {
  it('un partido bloqueado por tiempo expone locked:true aunque no haya predicción', async () => {
    const body = await (await get('/ko/matches?roundSlug=r32')).json()
    const locked = body.matches.find((x: { id: string }) => x.id === 'ko-r32-locked')
    expect(locked.locked).toBe(true)
    expect(locked.myPrediction).toBeNull()
    const open = body.matches.find((x: { id: string }) => x.id === 'ko-r32-open-1')
    expect(open.locked).toBe(false)
  })
})
