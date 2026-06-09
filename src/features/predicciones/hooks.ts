import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useAuth } from '../../auth/useAuth'
import { useBreakdown } from '../scoreboard/hooks'
import { keys } from '../../lib/queryClient'
import { getKoMatches } from '../ko/api'
import { ROUND_SLUGS } from '../../types/enums'
import type { KoMatchesResponse } from '../../types/api'

export function useMyTotals() {
  const { participant } = useAuth()
  return useBreakdown(participant?.id ?? '')
}

export function useAllKoPredictions(): { isLoading: boolean; rounds: KoMatchesResponse[] } {
  const results = useQueries({
    queries: ROUND_SLUGS.map((slug) => ({ queryKey: keys.ko.round(slug), queryFn: () => getKoMatches(slug) })),
  })
  const data = results.map((r) => r.data)
  // Cada r.data es estable en react-query; el array externo de useQueries no, por eso
  // desglosamos los datos como deps para no romper la memoización aguas abajo (useLiveHome).
  const rounds = useMemo(
    () => data.filter((d): d is KoMatchesResponse => !!d),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    data,
  )
  return { isLoading: results.some((r) => r.isLoading), rounds }
}
