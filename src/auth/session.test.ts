import { describe, it, expect, beforeEach } from 'vitest'
import { loadSession, saveSession, clearSession, getSession } from './session'
import { isApiError } from '../lib/errors'
import type { ParticipantMe } from '../types/api'

const juan: ParticipantMe = { id: 'p-juan', name: 'Juan', email: 'juan@gmail.com', role: 'participant' }

beforeEach(() => localStorage.clear())

describe('session (cache de identidad en localStorage)', () => {
  it('save → load devuelve el mismo participante', () => {
    saveSession(juan)
    expect(loadSession()).toEqual(juan)
  })

  it('load sin sesión devuelve null', () => {
    expect(loadSession()).toBeNull()
  })

  it('clear borra la sesión', () => {
    saveSession(juan)
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('load tolera JSON corrupto devolviendo null', () => {
    localStorage.setItem('polla.participant', '{not json')
    expect(loadSession()).toBeNull()
  })

  it('getSession resuelve con el participante cacheado', async () => {
    saveSession(juan)
    await expect(getSession()).resolves.toEqual(juan)
  })

  it('getSession lanza ApiError 401 sin sesión', async () => {
    const err = await getSession().catch((e) => e)
    expect(isApiError(err) && err.status).toBe(401)
  })
})
