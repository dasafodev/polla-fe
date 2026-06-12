import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { useAuth } from '../../auth/useAuth'
import { getGroups, getMyGroupPredictions, saveGroupPredictions, getThirds, saveThirds, getFriendsGroups, getGroupMatches } from './api'

export function useGroups() {
  return useQuery({ queryKey: keys.groups.all(), queryFn: getGroups })
}
export function useMyGroupPredictions() {
  const { participant } = useAuth()
  return useQuery({ queryKey: keys.groups.predictionsMe(participant?.id ?? 'anon'), queryFn: getMyGroupPredictions, enabled: !!participant })
}
export function useSaveGroupPredictions() {
  const qc = useQueryClient(); const { participant } = useAuth()
  return useMutation({
    mutationFn: saveGroupPredictions,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.groups.predictionsMe(participant?.id ?? 'anon') })
      qc.invalidateQueries({ queryKey: keys.groups.thirds(participant?.id ?? 'anon') }) // cascada
    },
  })
}
export function useThirds() {
  const { participant } = useAuth()
  return useQuery({ queryKey: keys.groups.thirds(participant?.id ?? 'anon'), queryFn: getThirds, enabled: !!participant })
}
export function useSaveThirds() {
  const qc = useQueryClient(); const { participant } = useAuth()
  return useMutation({ mutationFn: saveThirds, onSuccess: () => qc.invalidateQueries({ queryKey: keys.groups.thirds(participant?.id ?? 'anon') }) })
}
export function useFriendsGroups() {
  return useQuery({ queryKey: keys.groups.friends(), queryFn: getFriendsGroups })
}
export function useGroupMatches(filters: { date?: string; groupId?: string } = {}, opts: { pollMs?: number } = {}) {
  return useQuery({
    queryKey: keys.groups.matches(filters.date ?? null, filters.groupId ?? null),
    queryFn: () => getGroupMatches(filters),
    refetchInterval: opts.pollMs ?? false,
  })
}
