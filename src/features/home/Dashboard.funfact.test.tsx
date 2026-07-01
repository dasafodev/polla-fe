import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Aislamos la colocación del dato mundialista: mockeamos los hijos pesados y el
// hook de estado para controlar qué vista pinta el Dashboard. El FunFactCard real
// se renderiza (no se mockea) para verificar su presencia vía "Dato mundialista".
vi.mock('./components/DashboardHeader', () => ({ DashboardHeader: () => <div /> }))
vi.mock('./states/EmptyHome', () => ({ EmptyHome: () => <div>empty</div> }))
vi.mock('./states/InProgressHome', () => ({ InProgressHome: () => <div>progress</div> }))
vi.mock('./states/ReadyHome', () => ({ ReadyHome: () => <div>ready</div> }))
vi.mock('./states/LiveHome', () => ({ LiveHome: () => <div>live</div> }))
vi.mock('./colombia/useColombiaTakeover', () => ({ useColombiaTakeover: () => null }))
vi.mock('../onboarding/onboardingState', () => ({ useOnboardingState: vi.fn() }))

import { useOnboardingState } from '../onboarding/onboardingState'
import { Dashboard } from './Dashboard'

const mocked = vi.mocked(useOnboardingState)

function setState(partial: Record<string, unknown>) {
  const base = { loading: false, locked: false, isComplete: false, isFirstTime: false, closesAt: null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mocked.mockReturnValue({ ...base, ...partial } as any)
}

describe('Dashboard — dato mundialista en todos los estados menos loading', () => {
  it('NO muestra el dato en loading', () => {
    setState({ loading: true })
    render(<Dashboard />)
    expect(screen.queryByText('Dato mundialista')).not.toBeInTheDocument()
  })

  it('muestra el dato en empty', () => {
    setState({ isFirstTime: true })
    render(<Dashboard />)
    expect(screen.getByText('Dato mundialista')).toBeInTheDocument()
  })

  it('muestra el dato en progress', () => {
    setState({})
    render(<Dashboard />)
    expect(screen.getByText('Dato mundialista')).toBeInTheDocument()
  })

  it('muestra el dato en ready', () => {
    setState({ isComplete: true, closesAt: '2026-06-11T00:00:00Z' })
    render(<Dashboard />)
    expect(screen.getByText('Dato mundialista')).toBeInTheDocument()
  })

  it('muestra el dato en live', () => {
    setState({ locked: true })
    render(<Dashboard />)
    expect(screen.getByText('Dato mundialista')).toBeInTheDocument()
  })
})
