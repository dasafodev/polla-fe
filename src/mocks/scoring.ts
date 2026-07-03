import type { Db, DbKoMatch, DbKoPrediction, DbGroupRanking } from './db'
import { ROUND_TO_SCALE, type ScoringParams } from '../types/enums'
import { MAX_TRIPLES } from '../lib/constants'
import type {
  GroupPointsEarned, ThirdPointsEarned, KoPointsEarned, PowerupsPointsEarned,
  ScoreBreakdown, ScoreBreakdownDetail, ScoreboardEntry,
} from '../types/api'

// Espejo de polla-be/src/mappers/scoreboard.mapper.ts (PRIZES por rank 1/2/3).
const PRIZES = [800_000, 300_000, 100_000] as const
const TRIPLE_CAP = MAX_TRIPLES
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// ── Funciones puras (core) ────────────────────────────────────────────────────
export function computeGroupPoints(
  rankings: DbGroupRanking[], official: string[] | undefined, params: ScoringParams,
): GroupPointsEarned | null {
  if (!official) return null
  const officialPos = new Map(official.map((teamId, i) => [teamId, i + 1]))
  let exact = 0, partial = 0
  for (const r of rankings) {
    const realPos = officialPos.get(r.teamId)
    if (realPos == null) continue
    if (realPos === r.position) exact += 1
    else partial += 1
  }
  const allFour = rankings.length === 4 && exact === 4
  const pts_group_position_exact = exact * params.pts_group_position_exact
  const pts_group_position_partial = partial * params.pts_group_position_partial
  const bonus_group_complete = allFour ? params.bonus_group_complete : 0
  return {
    pts_group_position_exact, pts_group_position_partial, bonus_group_complete,
    total: pts_group_position_exact + pts_group_position_partial + bonus_group_complete,
  }
}

export function computeThirdPoints(
  teamId: string, officialBestThirds: string[] | null, params: ScoringParams,
): ThirdPointsEarned | null {
  if (!officialBestThirds) return null
  const pts_third_correct = officialBestThirds.includes(teamId) ? params.pts_third_correct : 0
  return { pts_third_correct, total: pts_third_correct }
}

// Espejo de polla-be/src/services/ko.service.ts. Sobre la base escalada por ronda:
//  - los partidos de Colombia valen ×mult_colombia_ko,
//  - el triple multiplica ×mult_triple TODO el partido (todo o nada; ambos se apilan multiplicativo),
//  - el marcador exacto cuenta aunque falles quién avanza (penales pueden cambiar el ganador).
export function computeKoPoints(
  match: DbKoMatch, pred: DbKoPrediction, params: ScoringParams, colombiaTeamId: string | null = null,
): KoPointsEarned | null {
  if (!match.result) return null
  const scale_slug = ROUND_TO_SCALE[match.roundSlug]
  const scale_factor = params[scale_slug]
  const advancesCorrect = pred.teamAdvancesId === match.result.winnerTeamId
  const scoreCorrect = pred.scoreHome === match.result.scoreHome && pred.scoreAway === match.result.scoreAway
  const fullyCorrect = scoreCorrect && advancesCorrect

  // Triple = todo o nada: activado y sin acertar TODO (marcador + quién avanza) → el partido queda en 0.
  if (pred.tripleActive && !fullyCorrect) {
    return { pts_ko_advances: 0, pts_ko_exact_score: 0, mult_colombia_ko: 0, mult_triple: 0, scale_factor, scale_slug, total: 0 }
  }

  const pts_ko_advances = (advancesCorrect ? params.pts_ko_advances : 0) * scale_factor
  const pts_ko_exact_score = (scoreCorrect ? params.pts_ko_exact_score : 0) * scale_factor
  const scaledBase = pts_ko_advances + pts_ko_exact_score

  const hasColombia = colombiaTeamId != null && (match.homeTeamId === colombiaTeamId || match.awayTeamId === colombiaTeamId)
  const colombiaFactor = hasColombia ? params.mult_colombia_ko : 1
  const mult_colombia_ko = scaledBase * (colombiaFactor - 1)
  const mult_triple = fullyCorrect && pred.tripleActive ? scaledBase * colombiaFactor * (params.mult_triple - 1) : 0

  return {
    pts_ko_advances, pts_ko_exact_score, mult_colombia_ko, mult_triple, scale_factor, scale_slug,
    total: scaledBase + mult_colombia_ko + mult_triple,
  }
}

// Id del equipo Colombia en el mock (o null si no está en el mundo actual). 'COL' = código FIFA.
const colombiaTeamIdOf = (db: Db): string | null => db.teams.find((t) => t.code === 'COL')?.id ?? null

// Escalas de la ruta principal KO en orden (R32→Final). Como el mock solo guarda cuántas rondas
// avanzó cada equipo, los pálpitos suman la escala de esas primeras N rondas (igual que el backend).
const KO_PATH_SCALES = ['scale_r32', 'scale_r16', 'scale_qf', 'scale_sf', 'scale_final'] as const
function roundsScaleSum(rounds: number, params: ScoringParams): number {
  let sum = 0
  for (let i = 0; i < rounds && i < KO_PATH_SCALES.length; i += 1) sum += params[KO_PATH_SCALES[i]]
  return sum
}

export function computePowerupsPoints(
  darkHorseTeamId: string | null, disappointmentTeamId: string | null,
  teamRoundsAdvanced: Record<string, number> | null, params: ScoringParams,
): PowerupsPointsEarned | null {
  if (!teamRoundsAdvanced) return null
  const dhRounds = darkHorseTeamId ? (teamRoundsAdvanced[darkHorseTeamId] ?? 0) : 0
  const dRounds = disappointmentTeamId ? (teamRoundsAdvanced[disappointmentTeamId] ?? 0) : 0
  const pts_dark_horse_per_round = roundsScaleSum(dhRounds, params) * params.pts_dark_horse_per_round // ≥ 0
  const pts_disappointment_per_round = -(roundsScaleSum(dRounds, params) * params.pts_disappointment_per_round) // ≤ 0
  return {
    pts_dark_horse_per_round, pts_disappointment_per_round,
    dark_horse_rounds_advanced: dhRounds, disappointment_rounds_advanced: dRounds,
    total: pts_dark_horse_per_round + pts_disappointment_per_round,
  }
}

// ── Wrappers db-aware (los que invocan los handlers) ──────────────────────────
export function groupPointsFor(db: Db, participantId: string, groupId: string): GroupPointsEarned | null {
  const gp = db.groupPredictions.find((g) => g.participantId === participantId && g.groupId === groupId)
  if (!gp) return null
  return computeGroupPoints(gp.rankings, db.officialGroupStandings?.[groupId], db.scoringParams)
}
export function thirdPointsFor(db: Db, _participantId: string, teamId: string): ThirdPointsEarned | null {
  return computeThirdPoints(teamId, db.officialBestThirds, db.scoringParams)
}
export function koPointsFor(db: Db, participantId: string, matchId: string): KoPointsEarned | null {
  const pred = db.koPredictions.find((p) => p.participantId === participantId && p.matchId === matchId)
  const match = db.koMatches.find((m) => m.id === matchId)
  if (!pred || !match) return null
  return computeKoPoints(match, pred, db.scoringParams, colombiaTeamIdOf(db))
}
export function powerupsPointsFor(db: Db, participantId: string): PowerupsPointsEarned | null {
  const pw = db.powerups.find((x) => x.participantId === participantId)
  return computePowerupsPoints(pw?.darkHorseTeamId ?? null, pw?.disappointmentTeamId ?? null, db.teamRoundsAdvanced, db.scoringParams)
}

// ── Derivados de participante ─────────────────────────────────────────────────
export function tripleUsesRemaining(db: Db, participantId: string): number {
  const used = db.koPredictions.filter((p) => p.participantId === participantId && p.tripleActive).length
  return clamp(TRIPLE_CAP - used, 0, TRIPLE_CAP)
}

// Índice matchId → match (O(1)), construido una sola vez por agregación para evitar find() en bucle.
function buildMatchIndex(db: Db): Map<string, DbKoMatch> {
  return new Map(db.koMatches.map((m) => [m.id, m]))
}

// Una sola pasada por las predicciones KO del participante: total de puntos + # de exactos.
function participantKo(db: Db, participantId: string, idx: Map<string, DbKoMatch>): { total: number; exact: number } {
  let total = 0, exact = 0
  const colId = colombiaTeamIdOf(db)
  for (const pred of db.koPredictions) {
    if (pred.participantId !== participantId) continue
    const match = idx.get(pred.matchId)
    if (!match) continue
    const pe = computeKoPoints(match, pred, db.scoringParams, colId)
    if (pe) total += pe.total
    if (match.result && pred.scoreHome === match.result.scoreHome && pred.scoreAway === match.result.scoreAway) exact += 1
  }
  return { total, exact }
}

// Puntaje completo de un participante en pasadas mínimas (grupos/terceros/ko/powerups), reusando el índice.
function scoreParticipant(db: Db, participantId: string, idx: Map<string, DbKoMatch>): { detail: ScoreBreakdownDetail; total: number; koExact: number } {
  let groups = 0
  for (const gp of db.groupPredictions) {
    if (gp.participantId !== participantId) continue
    const pe = computeGroupPoints(gp.rankings, db.officialGroupStandings?.[gp.groupId], db.scoringParams)
    if (pe) groups += pe.total
  }
  let thirds = 0
  const sel = db.thirdsSelections.find((s) => s.participantId === participantId)
  for (const teamId of sel?.teamIds ?? []) {
    const pe = computeThirdPoints(teamId, db.officialBestThirds, db.scoringParams)
    if (pe) thirds += pe.total
  }
  const { total: ko, exact: koExact } = participantKo(db, participantId, idx)
  const pw = powerupsPointsFor(db, participantId)
  const darkHorse = pw?.pts_dark_horse_per_round ?? 0
  const disappointment = pw?.pts_disappointment_per_round ?? 0
  const detail: ScoreBreakdownDetail = { groups, thirds, ko, darkHorse, disappointment }
  return { detail, total: groups + thirds + ko + darkHorse + disappointment, koExact }
}

export function countKoExact(db: Db, participantId: string, idx: Map<string, DbKoMatch> = buildMatchIndex(db)): number {
  return participantKo(db, participantId, idx).exact
}

export function computeBreakdown(db: Db, participantId: string, idx: Map<string, DbKoMatch> = buildMatchIndex(db)): ScoreBreakdown {
  const p = db.participants.find((x) => x.id === participantId)
  if (!p) throw new Error(`PARTICIPANT_NOT_FOUND:${participantId}`)
  const { detail, total } = scoreParticipant(db, participantId, idx)
  return {
    participant: { id: p.id, name: p.name },
    total,
    breakdown: detail,
    tripleUsesRemaining: tripleUsesRemaining(db, participantId),
    prize: null, // lo fija el handler con prizeForParticipant
  }
}

export function computeScoreboard(db: Db): ScoreboardEntry[] {
  const idx = buildMatchIndex(db)
  const rows = db.participants
    .filter((p) => p.role !== 'admin')
    .map((p) => { const s = scoreParticipant(db, p.id, idx); return { id: p.id, name: p.name, total: s.total, koExact: s.koExact } })
  rows.sort((a, b) => (b.total - a.total) || (b.koExact - a.koExact) || a.id.localeCompare(b.id))
  // Como el BE (scoreboard.service): empate pleno (total Y exactos KO) comparte rank;
  // el siguiente rank salta a la posición real (1,1,3…).
  let rank = 1
  return rows.map((r, i) => {
    const prev = rows[i - 1]
    if (i > 0 && (prev.total !== r.total || prev.koExact !== r.koExact)) rank = i + 1
    // El mock solo puntúa resultados ya oficiales (no proyecta predicciones abiertas), así que todo
    // lo computado es "confirmado": realTotal = total y simulatedTotal = 0.
    return { rank, participant: { id: r.id, name: r.name }, total: r.total, realTotal: r.total, simulatedTotal: 0, prize: i < PRIZES.length ? PRIZES[i] : null }
  })
}

// El backend solo expone el top N; si el usuario de la sesión queda fuera, lo anexa al final
// con su posición real para que siempre pueda verse en la tabla.
export function topScoreboard(entries: ScoreboardEntry[], currentId: string | null, limit = 10): ScoreboardEntry[] {
  const top = entries.slice(0, limit)
  if (!currentId || top.some((e) => e.participant.id === currentId)) return top
  const mine = entries.find((e) => e.participant.id === currentId)
  return mine ? [...top, mine] : top
}

export function prizeForParticipant(db: Db, participantId: string): number | null {
  return computeScoreboard(db).find((e) => e.participant.id === participantId)?.prize ?? null
}
