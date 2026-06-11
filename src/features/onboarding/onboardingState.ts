import { useMyGroupPredictions, useThirds, useFriendsGroups } from '../groups/hooks'
import { usePowerups } from '../powerups/hooks'
import { predictionsLocked, PREDICTIONS_CLOSE_AT } from '../../lib/predictionsLock'

export type StepKey = 'groups' | 'thirds' | 'powerups'
export type StepStatus = 'done' | 'in_progress' | 'pending' | 'disabled'

export interface OnboardingStep {
  key: StepKey
  label: string
  status: StepStatus
  current: number
  total: number
  detail: string
}

export interface OnboardingState {
  steps: OnboardingStep[]
  percent: number
  nextStepKey: StepKey | null
  isFirstTime: boolean
  isComplete: boolean
  locked: boolean
  closesAt: string | null
  loading: boolean
}

interface DeriveInput {
  completedGroups: number
  thirdsCount: number
  groupsDone: boolean
  hasDarkHorse: boolean
  hasDisappointment: boolean
  locked: boolean
  closesAt: string | null
  loading: boolean
}

export function deriveOnboardingState(i: DeriveInput): OnboardingState {
  const powerupsCount = (i.hasDarkHorse ? 1 : 0) + (i.hasDisappointment ? 1 : 0)

  const groups: OnboardingStep = {
    key: 'groups',
    label: 'Grupos',
    current: i.completedGroups,
    total: 12,
    detail: `${i.completedGroups} de 12 grupos`,
    status: i.completedGroups >= 12 ? 'done' : i.completedGroups > 0 ? 'in_progress' : 'pending',
  }
  const thirds: OnboardingStep = {
    key: 'thirds',
    label: 'Mejores terceros',
    current: i.thirdsCount,
    total: 8,
    detail: i.groupsDone ? `${i.thirdsCount} de 8 terceros` : 'Disponible al terminar los grupos',
    status: !i.groupsDone ? 'disabled' : i.thirdsCount >= 8 ? 'done' : i.thirdsCount > 0 ? 'in_progress' : 'pending',
  }
  const powerups: OnboardingStep = {
    key: 'powerups',
    label: 'Pálpitos',
    current: powerupsCount,
    total: 2,
    detail: `${powerupsCount} de 2 elegidos`,
    status: powerupsCount >= 2 ? 'done' : powerupsCount > 0 ? 'in_progress' : 'pending',
  }

  const steps = [groups, thirds, powerups]
  const fracs = [i.completedGroups / 12, i.thirdsCount / 8, powerupsCount / 2]
  const percent = Math.round((fracs.reduce((a, b) => a + b, 0) / 3) * 100)
  const nextStepKey = steps.find((s) => s.status === 'in_progress' || s.status === 'pending')?.key ?? null
  const isComplete = steps.every((s) => s.status === 'done')
  const isFirstTime = i.completedGroups === 0 && i.thirdsCount === 0 && powerupsCount === 0

  return { steps, percent, nextStepKey, isFirstTime, isComplete, locked: i.locked, closesAt: i.closesAt, loading: i.loading }
}

export function useOnboardingState(): OnboardingState {
  const groups = useMyGroupPredictions()
  const thirds = useThirds()
  const powerups = usePowerups()
  const friends = useFriendsGroups()
  const completedGroups = groups.data?.completedGroups ?? 0
  const locked = predictionsLocked(friends.data?.available)
  return deriveOnboardingState({
    completedGroups,
    thirdsCount: thirds.data?.selectedCount ?? 0,
    groupsDone: completedGroups >= 12,
    hasDarkHorse: !!powerups.data?.darkHorse,
    hasDisappointment: !!powerups.data?.disappointment,
    locked,
    closesAt: locked ? null : friends.data?.availableAt ?? PREDICTIONS_CLOSE_AT,
    loading: groups.isLoading || thirds.isLoading || powerups.isLoading,
  })
}
