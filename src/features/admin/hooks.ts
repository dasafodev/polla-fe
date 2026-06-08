import { useQuery } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { getAdminParticipants } from './api'

export function useAdminParticipants() {
  return useQuery({ queryKey: keys.admin.participants(), queryFn: getAdminParticipants })
}
