// Slugs de ronda KO (contrato)
export const ROUND_SLUGS = ['r32', 'r16', 'qf', 'sf', '3rd', 'final'] as const
export type RoundSlug = (typeof ROUND_SLUGS)[number]

// Estado de partido KO (contrato)
export type MatchStatus = 'scheduled' | 'live' | 'finished'

// Rol del participante (contrato)
export type Role = 'participant' | 'admin'

// Catálogo exhaustivo de códigos de error (§10 del spec)
export const ERROR_CODES = [
  'UNAUTHORIZED', 'FORBIDDEN', 'VALIDATION_ERROR', 'INVALID_GOOGLE_TOKEN',
  'INVITE_NOT_FOUND', 'INVITE_ALREADY_USED', 'INVITE_EXPIRED',
  'USER_NOT_FOUND', 'USER_ALREADY_EXISTS',
  'INVALID_PHONE', 'PHONE_ALREADY_EXISTS',
  'PREDICTIONS_LOCKED', 'INVALID_RANKINGS', 'INVALID_THIRD_CANDIDATE', 'INVALID_THIRDS_COUNT',
  'INVALID_DARK_HORSE', 'INVALID_DISAPPOINTMENT', 'POWERUPS_ALREADY_EXISTS', 'POWERUPS_NOT_FOUND',
  'MATCH_LOCKED', 'MATCH_FINISHED', 'INVALID_TEAM_ADVANCES', 'TRIPLE_USES_EXHAUSTED',
  'PREDICTION_ALREADY_EXISTS', 'PREDICTION_NOT_FOUND',
  'MATCH_NOT_FOUND', 'ROUND_NOT_FOUND', 'PARAM_NOT_FOUND', 'GROUPS_ALREADY_LOADED',
  'PARTICIPANT_NOT_FOUND', 'NETWORK_ERROR',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]
