import { describe, it, expect } from 'vitest'
import { displayName } from './names'

describe('displayName', () => {
  it('pasa a Título un nombre todo en mayúsculas', () => {
    expect(displayName('JUAN PEREZ')).toBe('Juan Perez')
  })
  it('pasa a Título un nombre todo en minúsculas (con tildes)', () => {
    expect(displayName('maría lópez')).toBe('María López')
  })
  it('respeta un nombre ya bien escrito', () => {
    expect(displayName('Santiago Forero')).toBe('Santiago Forero')
  })
  it('colapsa espacios repetidos y bordes', () => {
    expect(displayName('  ana   sofía  ')).toBe('Ana Sofía')
  })
  it('cadena vacía → cadena vacía', () => {
    expect(displayName('')).toBe('')
  })
})
