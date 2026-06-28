import type { ScoreboardEntry } from '../../types/api'

// La tabla muestra solo puntos oficiales: lo confirmado por el backend (realTotal).
// La proyección provisional (real + simulado) ya no se muestra.
export function officialPoints(entry: ScoreboardEntry): number {
  return entry.realTotal ?? 0
}
