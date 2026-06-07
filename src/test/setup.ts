import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { server } from '../mocks/server'
import { resetDb } from '../mocks/seed'
import { resetClock, setNow } from '../lib/clock'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  resetDb()
  resetClock()
  setNow('2026-06-06T12:00:00.000Z') // grupos abiertos, torneo no iniciado
})
afterEach(() => server.resetHandlers())
