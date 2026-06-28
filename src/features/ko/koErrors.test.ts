import { describe, it, expect } from 'vitest'
import { koSaveErrorText } from './koErrors'
import { ApiError } from '../../lib/errors'

describe('koSaveErrorText', () => {
  it('traduce por código aunque el backend mande el mensaje en inglés', () => {
    const e = new ApiError('MATCH_LOCKED', 'Match is closed for predictions', 423)
    expect(koSaveErrorText(e)).toBe('El partido ya cerró: no se pueden guardar pronósticos.')
  })

  it('cubre los códigos KO de escritura', () => {
    expect(koSaveErrorText(new ApiError('TRIPLE_USES_EXHAUSTED', 'x', 400))).toBe('Ya usaste tus 3 triples o nada.')
    expect(koSaveErrorText(new ApiError('PREDICTION_ALREADY_EXISTS', 'x', 409))).toBe('Ya tienes un pronóstico para este partido.')
    expect(koSaveErrorText(new ApiError('PREDICTION_NOT_FOUND', 'x', 404))).toBe('Aún no tienes un pronóstico para este partido.')
  })

  it('cae al genérico en español ante un código desconocido o un error no-API', () => {
    expect(koSaveErrorText(new ApiError('SOMETHING_NEW', 'weird', 500))).toBe('No se pudo guardar el pronóstico. Intenta de nuevo.')
    expect(koSaveErrorText(new Error('boom'))).toBe('No se pudo guardar el pronóstico. Intenta de nuevo.')
  })
})
