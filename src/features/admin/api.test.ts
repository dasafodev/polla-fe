import { describe, it, expect } from 'vitest'
import { adaptAdminParticipants } from './api'

describe('adaptAdminParticipants', () => {
  it('mapea totalScore → total y normaliza el role a minúsculas', () => {
    const out = adaptAdminParticipants({
      data: [
        { id: 'p1', name: 'Juan', email: 'j@x.com', phone: '+573001111111', role: 'PARTICIPANT', totalScore: 42 },
        { id: 'p2', name: 'Admin', email: 'a@x.com', phone: null, role: 'ADMIN', totalScore: 0 },
      ],
    })
    expect(out.data[0]).toMatchObject({ id: 'p1', total: 42, role: 'participant' })
    expect(out.data[1]).toMatchObject({ role: 'admin', total: 0, phone: null })
  })
})
