import { describe, it, expect, vi, afterEach } from 'vitest'
import { request } from './apiClient'
import { ApiError } from './errors'

function mockFetch(impl: typeof fetch) {
  vi.stubGlobal('fetch', impl)
}
afterEach(() => vi.unstubAllGlobals())

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
