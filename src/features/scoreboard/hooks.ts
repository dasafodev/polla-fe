import { useQuery } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { getScoreboard, getBreakdown } from './api'

export function useScoreboard() {
  return useQuery({ queryKey: keys.scoreboard.all(), queryFn: getScoreboard })
}
export function useBreakdown(participantId: string) {
  return useQuery({ queryKey: keys.scoreboard.breakdown(participantId), queryFn: () => getBreakdown(participantId), enabled: !!participantId })
}
