import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Aislamos el branch del Dashboard: héroe de Colombia vs header normal. Mockeamos hijos y el hook
// del takeover para controlar el caso, sin tocar react-query ni datos reales.
vi.mock('./components/DashboardHeader', () => ({ DashboardHeader: () => <div>header-normal</div> }))
vi.mock('./components/FunFactCard', () => ({ FunFactCard: () => <div /> }))
vi.mock('./states/EmptyHome', () => ({ EmptyHome: () => <div /> }))
vi.mock('./states/InProgressHome', () => ({ InProgressHome: () => <div /> }))
vi.mock('./states/ReadyHome', () => ({ ReadyHome: () => <div /> }))
vi.mock('./states/LiveHome', () => ({ LiveHome: () => <div>live</div> }))
vi.mock('./colombia/ColombiaHero', () => ({ ColombiaHero: () => <div>colombia-hero</div> }))
vi.mock('../onboarding/onboardingState', () => ({ useOnboardingState: vi.fn() }))
vi.mock('./colombia/useColombiaTakeover', () => ({ useColombiaTakeover: vi.fn() }))

import { useOnboardingState } from '../onboarding/onboardingState'
import { useColombiaTakeover } from './colombia/useColombiaTakeover'
import { Dashboard } from './Dashboard'

const onboarding = vi.mocked(useOnboardingState)
const takeover = vi.mocked(useColombiaTakeover)

function liveState() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onboarding.mockReturnValue({ loading: false, locked: true, isComplete: false, isFirstTime: false, closesAt: null } as any)
}

describe('Dashboard — Modo Colombia', () => {
  it('sin takeover → header normal, sin héroe', () => {
    liveState()
    takeover.mockReturnValue(null)
    render(<Dashboard />)
    expect(screen.getByText('header-normal')).toBeInTheDocument()
    expect(screen.queryByText('colombia-hero')).not.toBeInTheDocument()
  })

  it('con takeover activo → héroe de Colombia y sin header normal', () => {
    liveState()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    takeover.mockReturnValue({ phase: 'countdown', match: { id: 'm1' } } as any)
    render(<Dashboard />)
    expect(screen.getByText('colombia-hero')).toBeInTheDocument()
    expect(screen.queryByText('header-normal')).not.toBeInTheDocument()
  })
})
