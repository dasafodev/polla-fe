import { isApiError } from '../../lib/errors'

// El backend real serializa los AppError como { code, message } con el message en INGLÉS (regla del
// repo del backend). Como la app es 100% en español, traducimos por `code` (estable y tipado en
// ERROR_CODES), nunca mostrando el `message` crudo. Si el code es desconocido, cae al genérico.
const KO_SAVE_ERROR_ES: Record<string, string> = {
  MATCH_LOCKED: 'El partido ya cerró: no se pueden guardar pronósticos.',
  MATCH_FINISHED: 'El partido ya tiene resultado oficial.',
  INVALID_TEAM_ADVANCES: 'Elige un equipo válido para avanzar.',
  TRIPLE_USES_EXHAUSTED: 'Ya usaste tus 3 triples o nada.',
  PREDICTION_ALREADY_EXISTS: 'Ya tienes un pronóstico para este partido.',
  PREDICTION_NOT_FOUND: 'Aún no tienes un pronóstico para este partido.',
  MATCH_NOT_FOUND: 'No encontramos este partido.',
  UNAUTHORIZED: 'Tu sesión expiró. Vuelve a entrar.',
  NETWORK_ERROR: 'No pudimos conectar con el servidor. Revisa tu conexión.',
}

const FALLBACK = 'No se pudo guardar el pronóstico. Intenta de nuevo.'

export function koSaveErrorText(e: unknown): string {
  if (isApiError(e)) return KO_SAVE_ERROR_ES[e.code] ?? FALLBACK
  return FALLBACK
}
