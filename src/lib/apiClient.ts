import { env } from './env'
import { ApiError } from './errors'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
interface Options {
  body?: unknown
  query?: Record<string, string | number | undefined>
  signal?: AbortSignal
  timeoutMs?: number
}

// Handler global invocado cuando una petición real recibe 401 (cookie de sesión vencida/inválida).
// Lo registra AuthProvider para limpiar la sesión local. El bootstrap de `me` no pasa por aquí
// (lee localStorage sin red), así que sólo se dispara con un 401 del API real.
let unauthorizedHandler: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn
}

function buildUrl(path: string, query?: Options['query']): string {
  const base = env.apiBaseUrl.replace(/\/$/, '')
  const url = `${base}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, String(v))
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function request<T = unknown>(method: Method, path: string, opts: Options = {}): Promise<T> {
  const { body, query, signal, timeoutMs = 15000 } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (signal) signal.addEventListener('abort', () => controller.abort())

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No se pudo conectar con el servidor', 0)
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 204) return undefined as T

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Respuesta inválida del servidor', res.ok ? 0 : res.status)
  }

  if (!res.ok) {
    if (res.status === 401) unauthorizedHandler?.()
    // El backend real responde { code, message }; los mocks/contrato viejo usaban { error }.
    const err = data as { error?: string; code?: string; message?: string }
    throw new ApiError(err.code ?? 'NETWORK_ERROR', err.error ?? err.message ?? 'Error', res.status)
  }
  return data as T
}
