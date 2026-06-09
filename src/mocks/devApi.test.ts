import { describe, it, expect } from 'vitest'
import { db } from './db'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const post = (p: string, body?: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}), credentials: 'include' })

describe('dev-bypass (__dev__)', () => {
  it('login-as abre sesión y devuelve ese participante', async () => {
    const res = await post('/__dev__/login-as', { participantId: 'p-maria' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 'p-maria', name: 'María' })
    expect(db.currentSessionId).toBe('p-maria')
  })

  it('login-as con id inexistente → 404', async () => {
    const res = await post('/__dev__/login-as', { participantId: 'nope' })
    expect(res.status).toBe(404)
  })

  it('logout cierra la sesión', async () => {
    await post('/__dev__/login-as', { participantId: 'p-juan' })
    await post('/__dev__/logout')
    expect(db.currentSessionId).toBeNull()
  })

  it('set-now simula el reloj → candado de grupos/powerups se activa', async () => {
    await post('/__dev__/login-as', { participantId: 'p-luis' })
    await post('/__dev__/set-now', { iso: db.tournamentStartAt })
    const res = await post('/powerups/predictions', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(423)
  })

  it('participants lista los inscritos', async () => {
    const body = await (await get('/__dev__/participants')).json()
    expect(body.data.map((p: { id: string }) => p.id)).toContain('p-juan')
  })

  it('empty-world deja el mundo vacío y entra como usuario nuevo', async () => {
    const res = await post('/__dev__/empty-world')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ name: 'Nuevo', role: 'participant' })
    expect(db.currentSessionId).toBe('p-nuevo')
    expect(db.participants).toHaveLength(1) // sin otros jugadores
    expect(db.groupPredictions).toHaveLength(0) // sin polla
    expect(db.koMatches).toHaveLength(0) // sin partidos
    expect(db.groups.length).toBeGreaterThan(0) // catálogo presente para poder jugar
    // tabla vacía: el único participante está en 0 (la UI lo trata como "sin puntos")
    const sb = await (await get('/scoreboard')).json()
    expect(sb.data.every((e: { total: number }) => e.total === 0)).toBe(true)
  })

  it('reset restaura la semilla', async () => {
    await post('/__dev__/login-as', { participantId: 'p-luis' })
    await post('/powerups/predictions', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(db.powerups.some((x) => x.participantId === 'p-luis')).toBe(true)
    await post('/__dev__/reset')
    expect(db.powerups.some((x) => x.participantId === 'p-luis')).toBe(false)
  })

  it('set-now con ISO inválido → 400 y NO corrompe el reloj (el candado se mantiene)', async () => {
    await post('/__dev__/login-as', { participantId: 'p-luis' })
    await post('/__dev__/set-now', { iso: db.tournamentStartAt }) // candado activo
    const bad = await post('/__dev__/set-now', { iso: 'no-es-fecha' })
    expect(bad.status).toBe(400)
    // si el ISO inválido hubiera dejado now()=NaN, el candado se "abriría"; debe seguir cerrado (423)
    const res = await post('/powerups/predictions', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(423)
  })
})
