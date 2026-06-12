import { http, HttpResponse } from 'msw'
import { db, type DbGroup, type DbGroupPrediction } from '../db'
import { now } from '../../lib/clock'
import { err, requireSession, groupsLocked } from './_shared'
import { groupPointsFor, thirdPointsFor } from '../scoring'

const predOf = (pid: string, gid: string) => db.groupPredictions.find((p) => p.participantId === pid && p.groupId === gid)
const isComplete = (p?: DbGroupPrediction) => !!p && p.rankings.length === 4
const teamById = (id: string) => db.teams.find((t) => t.id === id)

// Espeja al cron calculate-group-stats del backend: % que puso ese equipo en esa posición.
// Sólo disponible una vez bloqueado (el cron corre al iniciar el torneo); null antes.
function consensusStat(teamId: string, position: number): { pct: number } | null {
  if (!groupsLocked()) return null
  const total = db.participants.filter((p) => p.role !== 'admin').length
  if (total === 0) return null
  const count = db.groupPredictions.filter((gp) =>
    gp.rankings.some((rr) => rr.teamId === teamId && rr.position === position),
  ).length
  if (count === 0) return null
  return { pct: Math.round((count / total) * 100 * 100) / 100 }
}

function thirdTeamId(pred?: DbGroupPrediction): string | null {
  if (!pred || pred.rankings.length !== 4) return null
  return pred.rankings.find((r) => r.position === 3)?.teamId ?? null
}
function validThirdCandidates(pid: string): Set<string> {
  const set = new Set<string>()
  for (const g of db.groups) { const t = thirdTeamId(predOf(pid, g.id)); if (t) set.add(t) }
  return set
}
function validateRankings(group: DbGroup, rankings: { teamId: string; position: number }[]): boolean {
  if (rankings.length !== 4) return false
  const positions = new Set<number>(), teamIds = new Set<string>()
  for (const r of rankings) {
    if (r.position < 1 || r.position > 4) return false
    if (positions.has(r.position) || teamIds.has(r.teamId)) return false
    if (!group.teamIds.includes(r.teamId)) return false
    positions.add(r.position); teamIds.add(r.teamId)
  }
  return positions.size === 4 && teamIds.size === 4
}
function serializeRankings(pred?: DbGroupPrediction, official?: string[]) {
  return (pred?.rankings ?? []).slice().sort((a, b) => a.position - b.position).map((r) => {
    const t = teamById(r.teamId)!
    const result: 'exact' | 'partial' | null = !official
      ? null
      : official.indexOf(t.id) === r.position - 1
        ? 'exact'
        : official.includes(t.id)
          ? 'partial'
          : null
    return { teamId: t.id, name: t.name, code: t.code, isTop8: t.isTop8, flag: t.flag, position: r.position, result, positionStats: consensusStat(t.id, r.position) }
  })
}

export const groupsHandlers = [
  http.get('/api/groups', () => {
    const s = requireSession(); if (s.response) return s.response
    const data = db.groups.map((g) => ({
      id: g.id, label: g.label, name: g.name,
      teams: g.teamIds.map((id) => { const t = teamById(id)!; return { id: t.id, name: t.name, code: t.code, isTop8: t.isTop8, flag: t.flag } }),
    }))
    return HttpResponse.json({ data }, { status: 200 })
  }),

  http.get('/api/groups/matches', ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const groupId = url.searchParams.get('groupId')

    let list = db.groupMatches
    if (groupId) list = list.filter((m) => m.groupId === groupId)
    if (date) {
      // Espeja colombiaDayRange del BE: día calendario de Colombia = [dateT05:00Z, +24h)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return err('INVALID_DATE', 'date must be in YYYY-MM-DD format', 400)
      const start = Date.parse(`${date}T05:00:00.000Z`)
      if (Number.isNaN(start)) return err('INVALID_DATE', `Invalid date: ${date}`, 400)
      const end = start + 24 * 60 * 60 * 1000
      list = list.filter((m) => { const t = Date.parse(m.scheduledAt); return t >= start && t < end })
    }

    const data = list
      .slice()
      .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) || a.matchNumber - b.matchNumber)
      .map((m) => {
        const g = db.groups.find((x) => x.id === m.groupId)!
        const home = teamById(m.homeTeamId)!
        const away = teamById(m.awayTeamId)!
        return {
          id: m.id, matchNumber: m.matchNumber, groupId: m.groupId, groupLabel: g.label,
          scheduledAt: m.scheduledAt, status: m.status.toUpperCase(),
          homeTeam: { id: home.id, name: home.name, code: home.code, flag: home.flag },
          awayTeam: { id: away.id, name: away.name, code: away.code, flag: away.flag },
          homeTeamLabel: home.name, awayTeamLabel: away.name,
          scoreHome: m.scoreHome, scoreAway: m.scoreAway,
        }
      })
    return HttpResponse.json({ data }, { status: 200 })
  }),

  http.post('/api/groups/predictions', async ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    if (groupsLocked()) return err('PREDICTIONS_LOCKED', 'Las predicciones de grupos están cerradas', 423)
    const body = (await request.json()) as { predictions: { groupId: string; rankings: { teamId: string; position: number }[] }[] }
    if (!body?.predictions?.length) return err('INVALID_RANKINGS', 'Predicciones vacías', 400)
    const seenGroups = new Set<string>()
    for (const p of body.predictions) {
      if (seenGroups.has(p.groupId)) return err('INVALID_RANKINGS', `Grupo ${p.groupId} duplicado en la solicitud`, 400)
      seenGroups.add(p.groupId)
      const group = db.groups.find((g) => g.id === p.groupId)
      if (!group) return err('INVALID_RANKINGS', `Grupo ${p.groupId} no existe`, 400)
      if (!validateRankings(group, p.rankings)) return err('INVALID_RANKINGS', `Rankings inválidos en grupo ${group.label}`, 400)
    }
    const pid = s.participant.id
    for (const p of body.predictions) {
      const existing = predOf(pid, p.groupId)
      const rankings = p.rankings.map((r) => ({ teamId: r.teamId, position: r.position }))
      if (existing) existing.rankings = rankings
      else db.groupPredictions.push({ participantId: pid, groupId: p.groupId, rankings })
    }
    // CASCADA: purgar terceros que dejaron de ser posición-3
    const candidates = validThirdCandidates(pid)
    const sel = db.thirdsSelections.find((x) => x.participantId === pid)
    if (sel) sel.teamIds = sel.teamIds.filter((id) => candidates.has(id))
    return HttpResponse.json({ ok: true, savedGroups: body.predictions.length }, { status: 200 })
  }),

  http.get('/api/groups/predictions/me', () => {
    const s = requireSession(); if (s.response) return s.response
    const pid = s.participant.id
    const data = db.groups.map((g) => {
      const pred = predOf(pid, g.id), complete = isComplete(pred)
      return {
        groupId: g.id, label: g.label, name: g.name, groupComplete: complete,
        rankings: serializeRankings(pred, db.officialGroupStandings?.[g.id]), pointsEarned: complete ? groupPointsFor(db, pid, g.id) : null,
      }
    })
    return HttpResponse.json({ data, completedGroups: data.filter((d) => d.groupComplete).length }, { status: 200 })
  }),

  http.get('/api/groups/thirds', () => {
    const s = requireSession(); if (s.response) return s.response
    const pid = s.participant.id
    const sel = db.thirdsSelections.find((x) => x.participantId === pid)
    const candidates = validThirdCandidates(pid)
    const selectedSet = new Set((sel?.teamIds ?? []).filter((id) => candidates.has(id)))
    const data = db.groups.map((g) => {
      const tId = thirdTeamId(predOf(pid, g.id)); if (!tId) return null
      const t = teamById(tId)!
      return { teamId: t.id, name: t.name, code: t.code, flag: t.flag, groupId: g.id, label: g.label, selected: selectedSet.has(t.id), pointsEarned: thirdPointsFor(db, pid, t.id) }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
    return HttpResponse.json({ data, selectedCount: selectedSet.size }, { status: 200 })
  }),

  http.post('/api/groups/thirds', async ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    if (groupsLocked()) return err('PREDICTIONS_LOCKED', 'Las predicciones de grupos están cerradas', 423)
    const body = (await request.json()) as { teamIds: string[] }
    const teamIds = body?.teamIds ?? []
    if (teamIds.length !== 8) return err('INVALID_THIRDS_COUNT', 'Debes seleccionar exactamente 8 equipos', 400)
    const pid = s.participant.id
    const candidates = validThirdCandidates(pid)
    const seen = new Set<string>()
    for (const id of teamIds) {
      if (seen.has(id) || !candidates.has(id)) return err('INVALID_THIRD_CANDIDATE', `El equipo ${id} no es un tercero válido en tus predicciones`, 400)
      seen.add(id)
    }
    const existing = db.thirdsSelections.find((x) => x.participantId === pid)
    if (existing) existing.teamIds = [...teamIds]
    else db.thirdsSelections.push({ participantId: pid, teamIds: [...teamIds] })
    return HttpResponse.json({ ok: true, selectedCount: 8 }, { status: 200 })
  }),

  http.get('/api/groups/predictions/friends', () => {
    const s = requireSession(); if (s.response) return s.response
    if (now() < Date.parse(db.tournamentStartAt)) return HttpResponse.json({ available: false, availableAt: db.tournamentStartAt }, { status: 200 })
    const meId = s.participant.id
    const data = db.participants.filter((p) => p.id !== meId && p.role !== 'admin').map((p) => ({
      participant: { id: p.id, name: p.name },
      predictions: db.groups.map((g) => {
        const pred = predOf(p.id, g.id)
        return { groupId: g.id, label: g.label, name: g.name, groupComplete: isComplete(pred), rankings: serializeRankings(pred), pointsEarned: null }
      }),
    }))
    return HttpResponse.json({ available: true, data }, { status: 200 })
  }),
]
