// Estado "en vivo" del Inicio: posición/puntos, KO pendientes y próximo partido KO.
// Función pura (deriveLiveHome) + hook (useLiveHome), espejando el patrón de onboarding/onboardingState.
// Todo sale de hooks existentes; ningún endpoint nuevo.

import { useMemo } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useScoreboard } from '../scoreboard/hooks'
import { useAllKoPredictions } from '../predicciones/hooks'
import type { KoMatch, KoMatchesResponse, ScoreboardEntry } from '../../types/api'

export interface PositionInfo {
  rank: number
  total: number
  totalParticipants: number
  leaderGap: number
  podiumGap: number | null
  hasScores: boolean
  prize: number | null
}

export interface PendingKoInfo {
  count: number
  roundName: string
  deadline: string
}

export interface LiveHomeState {
  loading: boolean
  position: PositionInfo | null
  pendingKo: PendingKoInfo | null
  nextMatch: KoMatch | null
}

interface DeriveInput {
  myId: string
  scoreboard: ScoreboardEntry[]
  rounds: KoMatchesResponse[]
  now: number
  loading: boolean
}

function predecible(m: KoMatch): boolean {
  return m.homeTeam != null && m.awayTeam != null
}

function derivePosition(myId: string, board: ScoreboardEntry[]): PositionInfo | null {
  const me = board.find((e) => e.participant.id === myId)
  if (!me) return null
  const sorted = [...board].sort((a, b) => a.rank - b.rank)
  const hasScores = !board.every((e) => e.total === 0)
  const leaderTotal = sorted[0]?.total ?? me.total
  const thirdTotal = sorted[2]?.total ?? null
  return {
    rank: me.rank,
    total: me.total,
    totalParticipants: board.length,
    leaderGap: hasScores ? Math.max(0, leaderTotal - me.total) : 0,
    podiumGap: me.rank > 3 && thirdTotal != null ? Math.max(0, thirdTotal - me.total) : null,
    hasScores,
    prize: me.prize,
  }
}

function derivePendingKo(rounds: KoMatchesResponse[]): PendingKoInfo | null {
  const open = [...rounds]
    .sort((a, b) => a.round.order - b.round.order)
    .map((r) => ({
      round: r.round,
      pending: r.matches.filter((m) => predecible(m) && !m.locked && m.status === 'scheduled' && m.myPrediction == null),
    }))
    .find((r) => r.pending.length > 0)
  if (!open) return null
  const deadline = open.pending.reduce((min, m) => (m.lockedAt < min ? m.lockedAt : min), open.pending[0].lockedAt)
  return { count: open.pending.length, roundName: open.round.name, deadline }
}

function deriveNextMatch(rounds: KoMatchesResponse[], now: number): KoMatch | null {
  // Próximo = en vivo, o programado con hora de inicio aún en el futuro (no partidos pasados/stale).
  const candidates = rounds
    .flatMap((r) => r.matches)
    .filter((m) => predecible(m) && (m.status === 'live' || (m.status === 'scheduled' && Date.parse(m.scheduledAt) > now)))
  if (candidates.length === 0) return null
  return candidates.sort((a, b) => {
    // Los partidos en vivo van primero; luego, por hora de inicio ascendente.
    const liveA = a.status === 'live' ? 0 : 1
    const liveB = b.status === 'live' ? 0 : 1
    if (liveA !== liveB) return liveA - liveB
    return Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)
  })[0]
}

export function deriveLiveHome(i: DeriveInput): LiveHomeState {
  return {
    loading: i.loading,
    position: derivePosition(i.myId, i.scoreboard),
    pendingKo: derivePendingKo(i.rounds),
    nextMatch: deriveNextMatch(i.rounds, i.now),
  }
}

export function useLiveHome(): LiveHomeState {
  const { participant } = useAuth()
  const scoreboard = useScoreboard()
  const ko = useAllKoPredictions()

  const myId = participant?.id ?? ''
  const boardData = scoreboard.data?.data
  const rounds = ko.rounds
  const loading = scoreboard.isLoading || ko.isLoading

  // `now` se captura solo cuando cambian los datos (no en cada render): así los sorts/derivaciones
  // no se recalculan en cada refetch de cualquier query del Dashboard.
  return useMemo(
    () => deriveLiveHome({ myId, scoreboard: boardData ?? [], rounds, now: Date.now(), loading }),
    [myId, boardData, rounds, loading],
  )
}
