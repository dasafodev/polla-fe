import { describe, it, expect, vi, afterEach } from 'vitest'
import { request, setUnauthorizedHandler } from './apiClient'
import { ApiError } from './errors'

function mockFetch(impl: typeof fetch) {
  vi.stubGlobal('fetch', impl)
}
afterEach(() => {
  vi.unstubAllGlobals()
  setUnauthorizedHandler(null)
})

describe('request', () => {
  it('devuelve JSON parseado en 2xx', async () => {
    mockFetch(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await expect(request('GET', '/x')).resolves.toEqual({ ok: true })
  })

  it('envía credentials include y serializa el body', async () => {
    const spy = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.credentials).toBe('include')
      expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
      expect(init.body).toBe(JSON.stringify({ a: 1 }))
      return new Response('{}', { status: 200 })
    })
    mockFetch(spy as unknown as typeof fetch)
    await request('POST', '/x', { body: { a: 1 } })
    expect(spy).toHaveBeenCalledOnce()
  })

  it('lanza ApiError con code/status del ErrorResponse en no-2xx', async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: 'No autorizado', code: 'UNAUTHORIZED' }), { status: 401 }))
    await expect(request('GET', '/x')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
  })

  it('lee message del envelope del backend real {code, message}', async () => {
    mockFetch(async () => new Response(JSON.stringify({ code: 'NEEDS_SIGNUP', message: 'Necesitas invitación' }), { status: 403 }))
    const err = await request('POST', '/auth/google').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe('NEEDS_SIGNUP')
    expect((err as ApiError).message).toBe('Necesitas invitación')
    expect((err as ApiError).status).toBe(403)
  })

  it('invoca el handler de no-autorizado en 401 (y sigue lanzando)', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    mockFetch(async () => new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'No autorizado' }), { status: 401 }))
    await expect(request('GET', '/groups')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('no invoca el handler de no-autorizado en otros errores', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    mockFetch(async () => new Response(JSON.stringify({ code: 'MATCH_NOT_FOUND', message: 'x' }), { status: 404 }))
    await request('GET', '/x').catch(() => {})
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('normaliza fallo de red a NETWORK_ERROR', async () => {
    mockFetch(async () => { throw new TypeError('Failed to fetch') })
    await expect(request('GET', '/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('normaliza respuesta no-JSON en error a NETWORK_ERROR', async () => {
    mockFetch(async () => new Response('<html>502</html>', { status: 502 }))
    const err = await request('GET', '/x').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe('NETWORK_ERROR')
  })

  it('204 resuelve a undefined', async () => {
    mockFetch(async () => new Response(null, { status: 204 }))
    await expect(request('POST', '/logout')).resolves.toBeUndefined()
  })
})
