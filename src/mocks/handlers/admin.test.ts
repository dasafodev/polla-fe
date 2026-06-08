import { describe, it, expect } from 'vitest'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const loginAs = (sub: string, name: string) => post('/auth/login', { credential: makeFakeIdToken({ sub, email: `${name}@x.com`, name }) })

describe('GET /admin/participants', () => {
  it('401 sin sesión', async () => {
    const res = await get('/admin/participants')
    expect(res.status).toBe(401)
  })
  it('403 FORBIDDEN si no es admin', async () => {
    await loginAs('sub-juan', 'Juan')
    const res = await get('/admin/participants')
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ code: 'FORBIDDEN' })
  })
  it('200 con la lista de inscritos si es admin', async () => {
    await loginAs('sub-admin', 'Admin')
    const res = await get('/admin/participants')
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.data.map((p: { id: string }) => p.id)
    expect(ids).toContain('p-juan')
    expect(ids).toContain('p-maria')
    const juan = body.data.find((p: { id: string }) => p.id === 'p-juan')
    expect(juan).toMatchObject({ name: 'Juan', email: 'juan@gmail.com', role: 'participant' })
    expect(typeof juan.total).toBe('number')
  })
})
