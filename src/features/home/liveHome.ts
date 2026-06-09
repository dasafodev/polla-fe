// Estado "en vivo" del Inicio: posición/puntos, KO pendientes, próximo partido y barra de pálpitos.
// Función pura (deriveLiveHome) + hook (useLiveHome), espejando el patrón de onboarding/onboardingState.
// Todo sale de hooks existentes; ningún endpoint nuevo.

import { useMemo } from 'react'
import { useAuth } from '../../auth/useAuth'
import { useScoreboard } from '../scoreboard/hooks'
import { useAllKoPredictions } from '../predicciones/hooks'
import { usePowerups } from '../powerups/hooks'
import type { KoMatch, KoMatchesResponse, MyPowerups, PowerupTeam, ScoreboardEntry } from '../../types/api'

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

export interface PalpitosInfo {
  revelacion: PowerupTeam | null
  decepcion: PowerupTeam | null
  won: number
  lost: number
  net: number
  greenPct: number
  redPct: number
  isEmpty: boolean
}

export interface LiveHomeState {
  loading: boolean
  position: PositionInfo | null
  pendingKo: PendingKoInfo | null
  nextMatch: KoMatch | null
  palpitos: PalpitosInfo
}

interface DeriveInput {
  myId: string
  scoreboard: ScoreboardEntry[]
  rounds: KoMatchesResponse[]
  powerups: MyPowerups | null
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

function derivePalpitos(pw: MyPowerups | null): PalpitosInfo {
  const revelacion = pw?.darkHorse ?? null
  const decepcion = pw?.disappointment ?? null
  const pe = pw?.pointsEarned ?? null
  if (!pe) {
    return { revelacion, decepcion, won: 0, lost: 0, net: 0, greenPct: 0, redPct: 0, isEmpty: true }
  }
  const won = Math.max(0, pe.pts_dark_horse_per_round)
  const lost = Math.abs(pe.pts_disappointment_per_round)
  const magnitude = won + lost
  const isEmpty = magnitude === 0
  return {
    revelacion,
    decepcion,
    won,
    lost,
    net: pe.total,
    greenPct: isEmpty ? 0 : Math.round((won / magnitude) * 100),
    redPct: isEmpty ? 0 : Math.round((lost / magnitude) * 100),
    isEmpty,
  }
}

export function deriveLiveHome(i: DeriveInput): LiveHomeState {
  return {
    loading: i.loading,
    position: derivePosition(i.myId, i.scoreboard),
    pendingKo: derivePendingKo(i.rounds),
    nextMatch: deriveNextMatch(i.rounds, i.now),
    palpitos: derivePalpitos(i.powerups),
  }
}

export function useLiveHome(): LiveHomeState {
  const { participant } = useAuth()
  const scoreboard = useScoreboard()
  const ko = useAllKoPredictions()
  const powerups = usePowerups()

  const myId = participant?.id ?? ''
  const boardData = scoreboard.data?.data
  const rounds = ko.rounds
  const pwData = powerups.data
  const loading = scoreboard.isLoading || ko.isLoading || powerups.isLoading

  // `now` se captura solo cuando cambian los datos (no en cada render): así los sorts/derivaciones
  // no se recalculan en cada refetch de cualquier query del Dashboard.
  return useMemo(
    () =>
      deriveLiveHome({ myId, scoreboard: boardData ?? [], rounds, powerups: pwData ?? null, now: Date.now(), loading }),
    [myId, boardData, rounds, pwData, loading],
  )
}
