export interface FakeIdTokenPayload {
  sub: string
  email: string
  name: string
  exp?: number // epoch segundos
}

function b64urlEncode(obj: unknown): string {
  const json = JSON.stringify(obj)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(seg: string): string {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  return decodeURIComponent(escape(atob(b64 + pad)))
}

/** Construye un ID token falso `header.payload.sig`. */
export function makeFakeIdToken(payload: FakeIdTokenPayload): string {
  return `${b64urlEncode({ alg: 'none' })}.${b64urlEncode(payload)}.sig`
}

/** Decodifica el payload o devuelve null si el token es inválido. */
export function decodeIdToken(token: string): FakeIdTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(b64urlDecode(parts[1])) as FakeIdTokenPayload
  } catch {
    return null
  }
}
