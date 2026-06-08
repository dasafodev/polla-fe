import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { err, requireSession } from './_shared'
import { computeScoreboard } from '../scoring'

export const adminHandlers = [
  // Única pantalla admin del front: lista de inscritos. El resto de la data entra por scripts a la DB.
  http.get('/api/admin/participants', () => {
    const s = requireSession(); if (s.response) return s.response
    if (s.participant.role !== 'admin') return err('FORBIDDEN', 'Acceso denegado', 403)
    // Un solo cómputo del scoreboard (excluye admin); el admin no concursa → total 0.
    const totals = new Map(computeScoreboard(db).map((e) => [e.participant.id, e.total]))
    const data = db.participants.map((p) => ({
      id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, total: totals.get(p.id) ?? 0,
    }))
    return HttpResponse.json({ data }, { status: 200 })
  }),
]
