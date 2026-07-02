// Slugs de ronda KO (contrato)
export const ROUND_SLUGS = ['r32', 'r16', 'qf', 'sf', '3rd', 'final'] as const
export type RoundSlug = (typeof ROUND_SLUGS)[number]

// Estado de partido KO (contrato)
export type MatchStatus = 'scheduled' | 'live' | 'finished'

// Rol del participante (contrato)
export type Role = 'participant' | 'admin'

// Catálogo de códigos de error. Alineado con los AppError reales del backend desplegado
// (polla-be/src). Se conservan algunos códigos legacy del contrato viejo por compatibilidad.
export const ERROR_CODES = [
  'UNAUTHORIZED', 'FORBIDDEN', 'VALIDATION_ERROR',
  // auth (backend real)
  'INVALID_CREDENTIAL', 'NEEDS_SIGNUP', 'ALREADY_REGISTERED',
  'INVITE_NOT_FOUND', 'INVITE_EXPIRED', 'INVITE_USED_OR_EXPIRED',
  'INVALID_PHONE',
  // predicciones / candados
  'PREDICTIONS_LOCKED', 'INVALID_RANKINGS', 'INVALID_THIRD_CANDIDATE', 'INVALID_THIRD_TEAM',
  'INVALID_THIRDS_COUNT', 'GROUP_NOT_FOUND',
  'INVALID_DARK_HORSE', 'INVALID_DISAPPOINTMENT', 'POWERUPS_ALREADY_EXISTS', 'POWERUPS_NOT_FOUND',
  'MISSING_FIELDS',
  'MATCH_LOCKED', 'MATCH_FINISHED', 'INVALID_TEAM_ADVANCES', 'TRIPLE_USES_EXHAUSTED',
  'PREDICTION_ALREADY_EXISTS', 'PREDICTION_NOT_FOUND',
  'MATCH_NOT_FOUND', 'ROUND_NOT_FOUND', 'INVALID_ROUND', 'TEAM_NOT_FOUND', 'INVALID_DATE',
  // admin
  'GROUPS_ALREADY_LOADED', 'INVALID_GROUPS_PAYLOAD', 'INVALID_TOP8_COUNT', 'INVALID_WINNER',
  'SCORING_PARAM_NOT_FOUND',
  'PARTICIPANT_NOT_FOUND', 'NETWORK_ERROR',
  // legacy (contrato anterior; aún referenciados por algún mock/dev tooling)
  'INVALID_GOOGLE_TOKEN', 'USER_NOT_FOUND', 'USER_ALREADY_EXISTS', 'INVITE_ALREADY_USED',
  'PHONE_ALREADY_EXISTS', 'PARAM_NOT_FOUND',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

// Escala de ronda KO (enum cerrado del contrato, KoMyPrediction.pointsEarned.scale_slug)
export const SCALE_SLUGS = ['scale_r32', 'scale_r16', 'scale_qf', 'scale_sf', 'scale_final'] as const
export type ScaleSlug = (typeof SCALE_SLUGS)[number]

// Mapa ronda KO → slug de escala. '3rd' reusa scale_sf (el contrato no define scale_3rd).
export const ROUND_TO_SCALE: Record<RoundSlug, ScaleSlug> = {
  r32: 'scale_r32', r16: 'scale_r16', qf: 'scale_qf', sf: 'scale_sf', '3rd': 'scale_sf', final: 'scale_final',
}

// Keys de scoring_params (contrato /admin/scoring-params)
export const SCORING_KEYS = [
  'pts_group_position_exact', 'pts_group_position_partial', 'bonus_group_complete',
  'pts_third_correct', 'pts_ko_advances', 'pts_ko_exact_score',
  'pts_dark_horse_per_round', 'pts_disappointment_per_round', 'mult_triple', 'mult_colombia_ko',
  'scale_r32', 'scale_r16', 'scale_qf', 'scale_sf', 'scale_final',
] as const
export type ScoringKey = (typeof SCORING_KEYS)[number]
export type ScoringParams = Record<ScoringKey, number>
