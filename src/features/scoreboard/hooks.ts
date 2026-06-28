import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { getScoreboard, getBreakdown, type ScoreboardSort } from './api'

export function useScoreboard(sortBy: ScoreboardSort = 'total') {
  // keepPreviousData: evita parpadear al skeleton en refetches mientras el backend reordena.
  return useQuery({
    queryKey: keys.scoreboard.all(sortBy),
    queryFn: () => getScoreboard(sortBy),
    placeholderData: keepPreviousData,
  })
}
export function useBreakdown(participantId: string) {
  return useQuery({ queryKey: keys.scoreboard.breakdown(participantId), queryFn: () => getBreakdown(participantId), enabled: !!participantId })
}
