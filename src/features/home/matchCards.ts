import type { GroupMatch } from '../../types/api'

export interface MatchCardsState { current: GroupMatch | null; previous: GroupMatch | null }

// "Actual" = en vivo (el que arrancó primero) o, si no hay, el programado más próximo.
// "Anterior" = el último terminado por hora de inicio. El status viene del BE (cron cada 5 min),
// así que no hace falta comparar contra el reloj local.
export function deriveMatchCards(matches: GroupMatch[]): MatchCardsState {
  const byKickoff = [...matches].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
  const current = byKickoff.find((m) => m.status === 'live') ?? byKickoff.find((m) => m.status === 'scheduled') ?? null
  const finished = byKickoff.filter((m) => m.status === 'finished')
  const previous = finished.length > 0 ? finished[finished.length - 1] : null
  return { current, previous }
}
