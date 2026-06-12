import type { Role, RoundSlug, MatchStatus, ScaleSlug } from './enums'

// schema ParticipantMe — FORMA NUEVA (§5.1): sin hasJoined/hasPhone
export interface ParticipantMe {
  id: string
  name: string
  email: string
  role: Role
}

// schema ErrorResponse
export interface ErrorResponse {
  error: string
  code: string
}

// schema HealthResponse
export interface HealthResponse {
  status: string
  db: string
  timestamp: string
}

// schema Invitation
export interface Invitation {
  id: string
  code: string
  status: 'available' | 'used'
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

// Bodies de auth (modelo nuevo §7)
export interface LoginBody {
  credential: string
}
export interface SignupBody {
  credential: string
  code: string
  phone: string
}

// ── Catálogo ───────────────────────────────────────────────────────────────
export interface TeamStanding {
  realPosition: number | null; pts: number; matchesPlayed: number
  goalsFor: number; goalsAgainst: number; goalDiff: number
}
export interface Team { id: string; name: string; code: string; isTop8: boolean; flag: string | null; standing?: TeamStanding | null }
export interface Group { id: string; label: string; name: string; teams: Team[] }

// ── Partidos de fase de grupos (GET /groups/matches — informativo, no paga puntos) ──
export interface GroupMatchTeam { id: string; name: string; code: string; flag: string | null }
export interface GroupMatch {
  id: string; matchNumber: number; groupId: string | null; groupLabel: string | null
  scheduledAt: string; status: MatchStatus
  homeTeam: GroupMatchTeam | null; awayTeam: GroupMatchTeam | null
  homeTeamLabel: string | null; awayTeamLabel: string | null
  scoreHome: number | null; scoreAway: number | null
}

// ── Grupos: predicciones ─────────────────────────────────────────────────────
export interface GroupRanking { teamId: string; name: string; code: string; isTop8: boolean; flag: string | null; position: number; result: 'exact' | 'partial' | null; consensusPct: number | null }
export interface GroupPointsEarned {
  pts_group_position_exact: number; pts_group_position_partial: number; bonus_group_complete: number; total: number
}
export interface GroupPrediction {
  groupId: string; label: string; name: string; groupComplete: boolean
  rankings: GroupRanking[]; pointsEarned: GroupPointsEarned | null
}
export interface MyGroupPredictions { data: GroupPrediction[]; completedGroups: number }
export interface SaveGroupPredictionsBody {
  predictions: { groupId: string; rankings: { teamId: string; position: number }[] }[]
}
export interface ParticipantPredictions { participant: { id: string; name: string }; predictions: GroupPrediction[] }
export interface FriendsGroups { available: boolean; availableAt?: string; data?: ParticipantPredictions[] }

// ── Terceros ─────────────────────────────────────────────────────────────────
export interface ThirdPointsEarned { pts_third_correct: number; total: number }
export interface ThirdCandidate {
  teamId: string; name: string; code: string; flag: string | null; groupId: string; label: string
  selected: boolean; pointsEarned: ThirdPointsEarned | null
}
export interface ThirdsResponse { data: ThirdCandidate[]; selectedCount: number }
export interface SaveThirdsBody { teamIds: string[] }

// ── Powerups ──────────────────────────────────────────────────────────────────
export interface PowerupTeam { teamId: string; name: string; code: string; isTop8: boolean; flag: string | null; stats?: { chosenPct: number | null } }
export interface PowerupsPointsEarned {
  pts_dark_horse_per_round: number; pts_disappointment_per_round: number
  dark_horse_rounds_advanced: number; disappointment_rounds_advanced: number; total: number
}
export interface MyPowerups {
  darkHorse: PowerupTeam | null; disappointment: PowerupTeam | null; pointsEarned?: PowerupsPointsEarned | null
}
export interface SavePowerupsBody { darkHorseTeamId: string; disappointmentTeamId: string }
export interface FriendPowerups {
  participant: { id: string; name: string }; darkHorse: PowerupTeam | null; disappointment: PowerupTeam | null
}
export interface FriendsPowerups { available: boolean; availableAt?: string; data?: FriendPowerups[] }

// ── KO ──────────────────────────────────────────────────────────────────────
export interface KoTeam { id: string; name: string; code: string; flag: string | null }
export interface KoResult { scoreHome: number; scoreAway: number; winnerTeamId: string }
export interface KoPointsEarned {
  pts_ko_advances: number; pts_ko_exact_score: number; mult_triple: number
  scale_factor: number; scale_slug: ScaleSlug; total: number
}
export interface KoMyPrediction {
  scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive: boolean
  lockedIn: boolean; pointsEarned: KoPointsEarned | null
}
export interface KoMatch {
  id: string; externalMatchId: number; matchNumber: number; scheduledAt: string; lockedAt: string
  status: MatchStatus; locked: boolean; homeTeam: KoTeam | null; awayTeam: KoTeam | null
  homeTeamLabel: string | null; awayTeamLabel: string | null
  result: KoResult | null; myPrediction: KoMyPrediction | null
}
export interface KoRound { slug: RoundSlug; name: string; order: number }
export interface KoMatchesResponse { round: KoRound; matches: KoMatch[] }
export interface SaveKoPredictionBody {
  scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive?: boolean
}
export interface SaveKoPredictionResponse { ok: boolean; tripleUsesRemaining: number }
export interface FriendKoPrediction {
  participant: { id: string; name: string }
  prediction: { scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive: boolean } | null
}
export interface FriendsKo { available: boolean; matchId: string; availableAt: string | null; data: FriendKoPrediction[] | null }

// ── Scoreboard / breakdown ────────────────────────────────────────────────────
export interface ScoreboardEntry { rank: number; participant: { id: string; name: string }; total: number; prize: number | null }
export interface Scoreboard { updatedAt: string; data: ScoreboardEntry[] }
export interface ScoreBreakdownDetail { groups: number; thirds: number; ko: number; darkHorse: number; disappointment: number }
export interface ScoreBreakdown {
  participant: { id: string; name: string }; total: number
  breakdown: ScoreBreakdownDetail; tripleUsesRemaining: number; prize: number | null
}

// ── Admin (única pantalla del front: lista de inscritos; el resto entra por scripts a la DB) ──
// Contrato abierto (§5.1/§13): definido a mano. paymentStatus (RF-07/D1) queda diferido — sin schema aún.
export interface AdminParticipant { id: string; name: string; email: string; phone: string | null; role: Role; total: number }
export interface AdminParticipantsResponse { data: AdminParticipant[] }
