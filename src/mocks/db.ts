import type { Role, RoundSlug, MatchStatus, ScoringParams } from '../types/enums'

export interface DbParticipant {
  id: string; googleSub: string; name: string; email: string; phone: string | null; role: Role
}
export interface DbInvitation {
  id: string; code: string; usedByParticipantId: string | null; usedAt: string | null; expiresAt: string; createdAt: string
}
export interface DbTeam { id: string; name: string; code: string; isTop8: boolean; flag: string | null; groupId: string }
export interface DbGroup { id: string; label: string; name: string; teamIds: string[] }
export interface DbGroupRanking { teamId: string; position: number }
export interface DbGroupPrediction { participantId: string; groupId: string; rankings: DbGroupRanking[] }
export interface DbThirdsSelection { participantId: string; teamIds: string[] }
export interface DbPowerups { participantId: string; darkHorseTeamId: string | null; disappointmentTeamId: string | null }
export interface DbKoRound { slug: RoundSlug; name: string; order: number }
export interface DbKoResult { scoreHome: number; scoreAway: number; winnerTeamId: string }
export interface DbKoSource { matchId: string; matchNumber: number; outcome: 'WINNER' | 'LOSER' }
export interface DbKoMatch {
  id: string; roundSlug: RoundSlug; externalMatchId: number; matchNumber: number
  scheduledAt: string; lockedAt: string; status: MatchStatus
  homeTeamId: string | null; awayTeamId: string | null; homeTeamLabel: string | null; awayTeamLabel: string | null
  homeSource: DbKoSource | null; awaySource: DbKoSource | null
  result: DbKoResult | null
}
export interface DbKoPrediction {
  participantId: string; matchId: string; scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive: boolean
}
export interface DbGroupMatch {
  id: string; matchNumber: number; groupId: string; scheduledAt: string
  status: 'scheduled' | 'live' | 'finished'
  homeTeamId: string; awayTeamId: string
  scoreHome: number | null; scoreAway: number | null
}

export interface Db {
  currentSessionId: string | null
  participants: DbParticipant[]
  invitations: DbInvitation[]
  tournamentStartAt: string
  teams: DbTeam[]
  groups: DbGroup[]
  groupPredictions: DbGroupPrediction[]
  thirdsSelections: DbThirdsSelection[]
  powerups: DbPowerups[]
  koRounds: DbKoRound[]
  koMatches: DbKoMatch[]
  koPredictions: DbKoPrediction[]
  groupMatches: DbGroupMatch[]
  scoringParams: ScoringParams
  // Estado oficial interno (solo seed; NO expuesto por el contrato participante)
  officialGroupStandings: Record<string, string[]> | null // groupId → [pos1,pos2,pos3,pos4] teamIds
  officialBestThirds: string[] | null                      // 8 teamIds
  teamRoundsAdvanced: Record<string, number> | null        // teamId → rondas KO avanzadas (powerups)
}

export let db: Db = makeEmptyDb()

function makeEmptyDb(): Db {
  return {
    currentSessionId: null, participants: [], invitations: [], tournamentStartAt: '2026-06-11T16:00:00.000Z',
    teams: [], groups: [], groupPredictions: [], thirdsSelections: [], powerups: [],
    koRounds: [], koMatches: [], koPredictions: [], groupMatches: [],
    scoringParams: {
      pts_group_position_exact: 0, pts_group_position_partial: 0, bonus_group_complete: 0,
      pts_third_correct: 0, pts_ko_advances: 0, pts_ko_exact_score: 0,
      pts_dark_horse_per_round: 0, pts_disappointment_per_round: 0, mult_triple: 0, mult_colombia_ko: 1,
      scale_r32: 1, scale_r16: 1, scale_qf: 1, scale_sf: 1, scale_final: 1,
    },
    officialGroupStandings: null, officialBestThirds: null, teamRoundsAdvanced: null,
  }
}

export function setDb(next: Db): void { db = next }
