import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { getKoMatches, getKoMatch, createKoPrediction, updateKoPrediction, getFriendsKo } from './api'
import type { RoundSlug } from '../../types/enums'
import type { SaveKoPredictionBody } from '../../types/api'

export function useKoMatches(round: RoundSlug) {
  return useQuery({ queryKey: keys.ko.round(round), queryFn: () => getKoMatches(round) })
}
export function useKoMatch(id: string) {
  return useQuery({ queryKey: keys.ko.match(id), queryFn: () => getKoMatch(id), enabled: !!id })
}
export function useSaveKoPrediction(id: string, mode: 'create' | 'update') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveKoPredictionBody) => (mode === 'create' ? createKoPrediction(id, body) : updateKoPrediction(id, body)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.ko.match(id) }) },
  })
}
export function useFriendsKo(id: string) {
  return useQuery({ queryKey: keys.ko.friends(id), queryFn: () => getFriendsKo(id), enabled: !!id })
}
