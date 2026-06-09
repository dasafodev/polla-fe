import { useAuth } from '../../auth/useAuth'
import { useBreakdown } from '../scoreboard/hooks'

export function useMyTotals() {
  const { participant } = useAuth()
  return useBreakdown(participant?.id ?? '')
}
