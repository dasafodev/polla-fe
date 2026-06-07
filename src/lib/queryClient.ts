import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './errors'

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  })
}

export const keys = {
  me: () => ['me'] as const,
  groups: {
    all: () => ['groups'] as const,
    predictionsMe: (pid: string) => ['groups', 'predictions', 'me', pid] as const,
    thirds: (pid: string) => ['groups', 'thirds', pid] as const,
    friends: () => ['groups', 'friends'] as const,
  },
  powerups: {
    me: (pid: string) => ['powerups', 'me', pid] as const,
    friends: () => ['powerups', 'friends'] as const,
  },
  ko: {
    round: (slug: string) => ['ko', 'round', slug] as const,
    match: (id: string) => ['ko', 'match', id] as const,
    friends: (id: string) => ['ko', 'friends', id] as const,
  },
  scoreboard: {
    all: () => ['scoreboard'] as const,
    breakdown: (pid: string) => ['scoreboard', 'breakdown', pid] as const,
  },
}
