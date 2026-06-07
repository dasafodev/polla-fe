import { describe, it, expect } from 'vitest'
import { ApiError, isApiError } from './errors'

describe('ApiError', () => {
  it('guarda code, message y status', () => {
    const e = new ApiError('UNAUTHORIZED', 'No autorizado', 401)
    expect(e.code).toBe('UNAUTHORIZED')
    expect(e.message).toBe('No autorizado')
    expect(e.status).toBe(401)
    expect(e).toBeInstanceOf(Error)
  })

  it('isApiError discrimina', () => {
    expect(isApiError(new ApiError('NETWORK_ERROR', 'x', 0))).toBe(true)
    expect(isApiError(new Error('plain'))).toBe(false)
    expect(isApiError(null)).toBe(false)
  })
})
