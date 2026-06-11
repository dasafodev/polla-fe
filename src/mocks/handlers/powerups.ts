import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { now } from '../../lib/clock'
import { err, requireSession, groupsLocked } from './_shared'
import { powerupsPointsFor } from '../scoring'

const teamById = (id: string) => db.teams.find((t) => t.id === id)

// Espeja al cron calculate-powerup-stats del backend: % que eligió ese equipo en ese slot.
// Sólo disponible una vez bloqueado (el cron corre al iniciar el torneo); null antes.
function chosenPct(teamId: string, kind: 'dark' | 'down'): number | null {
  if (!groupsLocked()) return null
  const total = db.participants.filter((p) => p.role !== 'admin').length
  if (total === 0) return null
  const count = db.powerups.filter(
    (pw) => (kind === 'dark' ? pw.darkHorseTeamId : pw.disappointmentTeamId) === teamId,
  ).length
  if (count === 0) return null
  return Math.round((count / total) * 100 * 100) / 100
}

function powerupTeam(id: string | null, kind: 'dark' | 'down') {
  if (!id) return null
  const t = teamById(id)
  return t ? { teamId: t.id, name: t.name, code: t.code, isTop8: t.isTop8, flag: t.flag, stats: { chosenPct: chosenPct(t.id, kind) } } : null
}
function serializeMine(pid: string) {
  const pw = db.powerups.find((x) => x.participantId === pid)
  return {
    darkHorse: powerupTeam(pw?.darkHorseTeamId ?? null, 'dark'),
    disappointment: powerupTeam(pw?.disappointmentTeamId ?? null, 'down'),
    pointsEarned: powerupsPointsFor(db, pid),
  }
}
function validateEligibility(darkHorseTeamId: string, disappointmentTeamId: string) {
  const dh = teamById(darkHorseTeamId), d = teamById(disappointmentTeamId)
  if (!dh || dh.isTop8) return err('INVALID_DARK_HORSE', 'El caballo negro debe ser un equipo fuera del top 8 FIFA', 400)
  if (!d || !d.isTop8) return err('INVALID_DISAPPOINTMENT', 'La decepción debe ser un equipo dentro del top 8 FIFA', 400)
  return null
}

export const powerupsHandlers = [
  http.get('/api/powerups/predictions/me', () => {
    const s = requireSession(); if (s.response) return s.response
    return HttpResponse.json(serializeMine(s.participant.id), { status: 200 })
  }),

  http.post('/api/powerups/predictions', async ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    if (groupsLocked()) return err('PREDICTIONS_LOCKED', 'Los powerups están cerrados', 423)
    const body = (await request.json()) as { darkHorseTeamId: string; disappointmentTeamId: string }
    const bad = validateEligibility(body.darkHorseTeamId, body.disappointmentTeamId)
    if (bad) return bad
    const pid = s.participant.id
    if (db.powerups.some((x) => x.participantId === pid)) return err('POWERUPS_ALREADY_EXISTS', 'Ya tienes powerups registrados', 409)
    db.powerups.push({ participantId: pid, darkHorseTeamId: body.darkHorseTeamId, disappointmentTeamId: body.disappointmentTeamId })
    return HttpResponse.json(serializeMine(pid), { status: 201 })
  }),

  http.put('/api/powerups/predictions', async ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    if (groupsLocked()) return err('PREDICTIONS_LOCKED', 'Los powerups están cerrados', 423)
    const body = (await request.json()) as { darkHorseTeamId: string; disappointmentTeamId: string }
    const bad = validateEligibility(body.darkHorseTeamId, body.disappointmentTeamId)
    if (bad) return bad
    const pid = s.participant.id
    const existing = db.powerups.find((x) => x.participantId === pid)
    if (!existing) return err('POWERUPS_NOT_FOUND', 'No tienes powerups registrados', 404)
    existing.darkHorseTeamId = body.darkHorseTeamId
    existing.disappointmentTeamId = body.disappointmentTeamId
    return HttpResponse.json(serializeMine(pid), { status: 200 })
  }),

  http.get('/api/powerups/predictions/friends', () => {
    const s = requireSession(); if (s.response) return s.response
    if (now() < Date.parse(db.tournamentStartAt)) return HttpResponse.json({ available: false, availableAt: db.tournamentStartAt }, { status: 200 })
    const meId = s.participant.id
    const data = db.participants.filter((p) => p.id !== meId && p.role !== 'admin').map((p) => {
      const pw = db.powerups.find((x) => x.participantId === p.id)
      return { participant: { id: p.id, name: p.name }, darkHorse: powerupTeam(pw?.darkHorseTeamId ?? null, 'dark'), disappointment: powerupTeam(pw?.disappointmentTeamId ?? null, 'down') }
    })
    return HttpResponse.json({ available: true, data }, { status: 200 })
  }),
]
