import { describe, it, expect } from 'vitest'
import { pickHomeView } from './homeView'

const base = { loading: false, locked: false, isComplete: false, isFirstTime: false }

describe('pickHomeView', () => {
  it('loading manda sobre todo lo demás', () => {
    expect(pickHomeView({ ...base, loading: true, locked: true })).toBe('loading')
  })
  it('locked → live (aunque esté completa)', () => {
    expect(pickHomeView({ ...base, locked: true, isComplete: true })).toBe('live')
  })
  it('completa y sin candado → ready', () => {
    expect(pickHomeView({ ...base, isComplete: true })).toBe('ready')
  })
  it('primera vez → empty', () => {
    expect(pickHomeView({ ...base, isFirstTime: true })).toBe('empty')
  })
  it('a medias → progress', () => {
    expect(pickHomeView(base)).toBe('progress')
  })
})
