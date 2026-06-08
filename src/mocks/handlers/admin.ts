import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { err, requireSession } from './_shared'
import { computeBreakdown } from '../scoring'

export const adminHandlers = [
  // Única pantalla admin del front: lista de inscritos. El resto de la data entra por scripts a la DB.
  http.get('/api/admin/participants', () => {
    const s = requireSession(); if (s.response) return s.response
    if (s.participant.role !== 'admin') return err('FORBIDDEN', 'Acceso denegado', 403)
    const data = db.participants.map((p) => ({
      id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, total: computeBreakdown(db, p.id).total,
    }))
    return HttpResponse.json({ data }, { status: 200 })
  }),
]
