import { http, HttpResponse } from 'msw'
import { db, type DbKoMatch } from '../db'
import { ROUND_SLUGS } from '../../types/enums'
import { roundToFrontend } from '../../lib/contract'
import { now } from '../../lib/clock'
import { err, requireSession } from './_shared'
import { koPointsFor } from '../scoring'

const TRIPLE_CAP = 3
const matchLocked = (m: DbKoMatch) => now() >= Date.parse(m.lockedAt)
const validScore = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0
const predOf = (pid: string, mid: string) => db.koPredictions.find((p) => p.participantId === pid && p.matchId === mid)
const tripleUsed = (pid: string) => db.koPredictions.filter((p) => p.participantId === pid && p.tripleActive).length
function koTeam(id: string | null) {
  if (!id) return null
  const t = db.teams.find((x) => x.id === id); return t ? { id: t.id, name: t.name, code: t.code, flag: t.flag } : null
}
function serializeMatch(m: DbKoMatch, pid: string) {
  const mp = predOf(pid, m.id)
  // El backend NO serializa `locked` a nivel de partido (solo lockedAt); el FE lo deriva en adaptKoMatch.
  return {
    id: m.id, externalMatchId: m.externalMatchId, matchNumber: m.matchNumber, scheduledAt: m.scheduledAt, lockedAt: m.lockedAt,
    status: m.status, homeTeam: koTeam(m.homeTeamId), awayTeam: koTeam(m.awayTeamId),
    homeTeamLabel: m.homeTeamLabel, awayTeamLabel: m.awayTeamLabel, result: m.result,
    myPrediction: mp ? {
      scoreHome: mp.scoreHome, scoreAway: mp.scoreAway, teamAdvancesId: mp.teamAdvancesId, tripleActive: mp.tripleActive,
      lockedIn: now() >= Date.parse(m.lockedAt), pointsEarned: m.result ? koPointsFor(db, pid, m.id) : null,
    } : null,
  }
}

export const koHandlers = [
  http.get('/api/ko/matches', ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    // El cliente real envía el slug en MAYÚSCULAS (R32…/THIRD); lo normalizamos a la forma del seed.
    const rawSlug = new URL(request.url).searchParams.get('roundSlug')
    const slug = rawSlug ? roundToFrontend(rawSlug) : null
    if (!slug || !ROUND_SLUGS.includes(slug)) return err('VALIDATION_ERROR', 'roundSlug es requerido', 400)
    const round = db.koRounds.find((r) => r.slug === slug)!
    const matches = db.koMatches.filter((m) => m.roundSlug === slug).sort((a, b) => a.matchNumber - b.matchNumber).map((m) => serializeMatch(m, s.participant.id))
    return HttpResponse.json({ round, matches }, { status: 200 })
  }),

  http.get('/api/ko/matches/:matchId', ({ params }) => {
    const s = requireSession(); if (s.response) return s.response
    const m = db.koMatches.find((x) => x.id === params.matchId)
    if (!m) return err('MATCH_NOT_FOUND', 'Partido no encontrado', 404)
    return HttpResponse.json(serializeMatch(m, s.participant.id), { status: 200 })
  }),

  http.post('/api/ko/matches/:matchId/predictions', async ({ params, request }) => {
    const s = requireSession(); if (s.response) return s.response
    const m = db.koMatches.find((x) => x.id === params.matchId)
    if (!m) return err('MATCH_NOT_FOUND', 'Partido no encontrado', 404)
    if (m.status === 'finished') return err('MATCH_FINISHED', 'El partido ya tiene resultado oficial', 423)
    if (matchLocked(m)) return err('MATCH_LOCKED', 'El partido está cerrado para predicciones', 423)
    const body = (await request.json()) as { scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive?: boolean }
    if (!validScore(body.scoreHome) || !validScore(body.scoreAway)) return err('VALIDATION_ERROR', 'El marcador debe ser un entero ≥ 0', 400)
    if (body.teamAdvancesId !== m.homeTeamId && body.teamAdvancesId !== m.awayTeamId) return err('INVALID_TEAM_ADVANCES', 'teamAdvancesId no corresponde a un equipo del partido', 400)
    const pid = s.participant.id
    if (predOf(pid, m.id)) return err('PREDICTION_ALREADY_EXISTS', 'Ya existe una predicción para este partido', 409)
    const wantsTriple = body.tripleActive === true
    if (wantsTriple && tripleUsed(pid) >= TRIPLE_CAP) return err('TRIPLE_USES_EXHAUSTED', 'No tienes usos de triple o nada disponibles', 400)
    db.koPredictions.push({ participantId: pid, matchId: m.id, scoreHome: body.scoreHome, scoreAway: body.scoreAway, teamAdvancesId: body.teamAdvancesId, tripleActive: wantsTriple })
    return HttpResponse.json({ ok: true, tripleUsesRemaining: TRIPLE_CAP - tripleUsed(pid) }, { status: 201 })
  }),

  http.put('/api/ko/matches/:matchId/predictions', async ({ params, request }) => {
    const s = requireSession(); if (s.response) return s.response
    const m = db.koMatches.find((x) => x.id === params.matchId)
    if (!m) return err('MATCH_NOT_FOUND', 'Partido no encontrado', 404)
    if (m.status === 'finished') return err('MATCH_FINISHED', 'El partido ya tiene resultado oficial', 423)
    if (matchLocked(m)) return err('MATCH_LOCKED', 'El partido está cerrado para predicciones', 423)
    const body = (await request.json()) as { scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive: boolean }
    if (!validScore(body.scoreHome) || !validScore(body.scoreAway)) return err('VALIDATION_ERROR', 'El marcador debe ser un entero ≥ 0', 400)
    if (body.teamAdvancesId !== m.homeTeamId && body.teamAdvancesId !== m.awayTeamId) return err('INVALID_TEAM_ADVANCES', 'teamAdvancesId no corresponde a un equipo del partido', 400)
    const pid = s.participant.id
    const existing = predOf(pid, m.id)
    if (!existing) return err('PREDICTION_NOT_FOUND', 'No existe predicción para este partido', 404)
    const was = existing.tripleActive, wants = body.tripleActive === true
    if (!was && wants && tripleUsed(pid) >= TRIPLE_CAP) return err('TRIPLE_USES_EXHAUSTED', 'No tienes usos de triple o nada disponibles', 400)
    existing.scoreHome = body.scoreHome; existing.scoreAway = body.scoreAway
    existing.teamAdvancesId = body.teamAdvancesId; existing.tripleActive = wants
    return HttpResponse.json({ ok: true, tripleUsesRemaining: TRIPLE_CAP - tripleUsed(pid) }, { status: 200 })
  }),

  http.get('/api/ko/matches/:matchId/predictions/friends', ({ params }) => {
    const s = requireSession(); if (s.response) return s.response
    const m = db.koMatches.find((x) => x.id === params.matchId)
    if (!m) return err('MATCH_NOT_FOUND', 'Partido no encontrado', 404)
    if (now() < Date.parse(m.scheduledAt)) return HttpResponse.json({ available: false, matchId: m.id, availableAt: m.scheduledAt, data: null }, { status: 200 })
    const meId = s.participant.id
    const data = db.participants.filter((p) => p.id !== meId && p.role !== 'admin').map((p) => {
      const pr = predOf(p.id, m.id)
      return { participant: { id: p.id, name: p.name }, prediction: pr ? { scoreHome: pr.scoreHome, scoreAway: pr.scoreAway, teamAdvancesId: pr.teamAdvancesId, tripleActive: pr.tripleActive } : null }
    })
    return HttpResponse.json({ available: true, matchId: m.id, availableAt: null, data }, { status: 200 })
  }),
]
