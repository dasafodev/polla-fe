import { describe, it, expect } from 'vitest'
import { FUN_FACTS } from './funFacts'

describe('FUN_FACTS', () => {
  it('tiene 60 datos', () => {
    expect(FUN_FACTS).toHaveLength(60)
  })

  it('ids del 1 al 60, sin repetir', () => {
    const ids = FUN_FACTS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(Math.min(...ids)).toBe(1)
    expect(Math.max(...ids)).toBe(60)
  })

  it('cada dato tiene texto, fuente y url válida', () => {
    for (const f of FUN_FACTS) {
      expect(f.text.trim().length).toBeGreaterThan(0)
      expect(f.source.trim().length).toBeGreaterThan(0)
      expect(f.url).toMatch(/^https?:\/\//)
    }
  })

  it('no hay textos duplicados', () => {
    const texts = FUN_FACTS.map((f) => f.text.trim())
    expect(new Set(texts).size).toBe(texts.length)
  })
})
