import { describe, it, expect } from 'vitest'
import { shouldRetry, keys } from './queryClient'
import { ApiError } from './errors'

describe('shouldRetry', () => {
  it('no reintenta en 4xx', () => {
    expect(shouldRetry(0, new ApiError('PREDICTIONS_LOCKED', 'x', 423))).toBe(false)
    expect(shouldRetry(0, new ApiError('UNAUTHORIZED', 'x', 401))).toBe(false)
  })
  it('reintenta hasta 2 veces en red/5xx', () => {
    expect(shouldRetry(0, new ApiError('NETWORK_ERROR', 'x', 0))).toBe(true)
    expect(shouldRetry(2, new ApiError('NETWORK_ERROR', 'x', 0))).toBe(false)
  })
})

describe('keys', () => {
  it('genera claves estables', () => {
    expect(keys.me()).toEqual(['me'])
    expect(keys.ko.round('r32')).toEqual(['ko', 'round', 'r32'])
    expect(keys.ko.match('uuid-1')).toEqual(['ko', 'match', 'uuid-1'])
  })
})
