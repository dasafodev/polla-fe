import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { now } from '../../lib/clock'
import { err, requireSession } from './_shared'
import { computeScoreboard, computeBreakdown, prizeForParticipant, topScoreboard } from '../scoring'

export const scoreboardHandlers = [
  http.get('/api/scoreboard', ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    const all = computeScoreboard(db)
    const limit = new URL(request.url).searchParams.get('limit')
    // limit=all → tabla completa; numérico/ausente → top N (default 10) con el viewer anexado si quedó fuera.
    const data = limit === 'all' ? all : topScoreboard(all, s.participant.id, limit ? Number(limit) : 10)
    return HttpResponse.json({ updatedAt: new Date(now()).toISOString(), data }, { status: 200 })
  }),

  http.get('/api/scoreboard/:participantId/breakdown', ({ params }) => {
    const s = requireSession(); if (s.response) return s.response
    const id = String(params.participantId)
    // El admin no concursa (excluido del scoreboard en todas partes); su desglose no existe como concursante.
    const target = db.participants.find((p) => p.id === id)
    if (!target || target.role === 'admin') return err('PARTICIPANT_NOT_FOUND', 'Participante no encontrado', 404)
    const bd = computeBreakdown(db, id)
    return HttpResponse.json({ ...bd, prize: prizeForParticipant(db, id) }, { status: 200 })
  }),
]
