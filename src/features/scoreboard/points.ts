import type { ScoreboardEntry } from '../../types/api'

export type PointsView = 'provisional' | 'official'

// Provisionales = proyección total (real + simulado). Oficiales = solo lo confirmado por el backend.
export function pointsFor(entry: ScoreboardEntry, view: PointsView): number {
  return view === 'official' ? (entry.realTotal ?? 0) : entry.total
}
