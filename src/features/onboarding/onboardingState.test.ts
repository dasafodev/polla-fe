import { describe, it, expect } from 'vitest'
import { deriveOnboardingState } from './onboardingState'

const base = {
  completedGroups: 0,
  thirdsCount: 0,
  groupsDone: false,
  hasDarkHorse: false,
  hasDisappointment: false,
  locked: false,
  closesAt: null,
  loading: false,
}

describe('deriveOnboardingState', () => {
  it('primera vez: todo en cero, 0%, siguiente paso = grupos', () => {
    const s = deriveOnboardingState(base)
    expect(s.isFirstTime).toBe(true)
    expect(s.percent).toBe(0)
    expect(s.nextStepKey).toBe('groups')
    expect(s.steps[1].status).toBe('disabled')
  })

  it('grupos a medias: in_progress y porcentaje proporcional', () => {
    const s = deriveOnboardingState({ ...base, completedGroups: 6 })
    expect(s.steps[0].status).toBe('in_progress')
    expect(s.isFirstTime).toBe(false)
    expect(s.percent).toBe(17)
  })

  it('grupos completos habilitan terceros y avanzan el siguiente paso', () => {
    const s = deriveOnboardingState({ ...base, completedGroups: 12, groupsDone: true })
    expect(s.steps[0].status).toBe('done')
    expect(s.steps[1].status).toBe('pending')
    expect(s.nextStepKey).toBe('thirds')
  })

  it('todo completo: isComplete true, 100%, sin siguiente paso', () => {
    const s = deriveOnboardingState({
      ...base,
      completedGroups: 12,
      groupsDone: true,
      thirdsCount: 8,
      hasDarkHorse: true,
      hasDisappointment: true,
    })
    expect(s.isComplete).toBe(true)
    expect(s.percent).toBe(100)
    expect(s.nextStepKey).toBe(null)
  })

  it('propaga locked y closesAt', () => {
    const s = deriveOnboardingState({ ...base, locked: true, closesAt: '2026-06-11T16:00:00.000Z' })
    expect(s.locked).toBe(true)
    expect(s.closesAt).toBe('2026-06-11T16:00:00.000Z')
  })
})
