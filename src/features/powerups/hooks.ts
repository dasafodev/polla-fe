import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { useAuth } from '../../auth/useAuth'
import { getMyPowerups, createPowerups, updatePowerups, getFriendsPowerups } from './api'
import type { SavePowerupsBody } from '../../types/api'

export function usePowerups() {
  const { participant } = useAuth()
  return useQuery({ queryKey: keys.powerups.me(participant?.id ?? 'anon'), queryFn: getMyPowerups, enabled: !!participant })
}
export function useSavePowerups(mode: 'create' | 'update') {
  const qc = useQueryClient(); const { participant } = useAuth()
  return useMutation({
    mutationFn: (body: SavePowerupsBody) => (mode === 'create' ? createPowerups(body) : updatePowerups(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.powerups.me(participant?.id ?? 'anon') }),
  })
}
export function useFriendsPowerups() {
  return useQuery({ queryKey: keys.powerups.friends(), queryFn: getFriendsPowerups })
}
