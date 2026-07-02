import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColombiaHero } from './ColombiaHero'
import type { ColombiaTakeover } from './colombiaTakeover'
import type { KoMatch, KoTeam } from '../../../types/api'

const COL = { id: 'col', name: 'Colombia', code: 'COL', flag: null } as KoTeam
const BRA = { id: 'bra', name: 'Brasil', code: 'BRA', flag: null } as KoTeam

function takeover(over: Partial<ColombiaTakeover>): ColombiaTakeover {
  return {
    phase: 'countdown',
    match: { id: 'm1' } as KoMatch,
    roundLong: 'Cuartos',
    colombia: COL,
    opponent: BRA,
    kickoffAt: '2026-09-01T23:30:00.000Z',
    score: null,
    ...over,
  }
}

describe('ColombiaHero — informativo de puntos ×5', () => {
  it('muestra el chip en cuenta regresiva', () => {
    render(<ColombiaHero takeover={takeover({ phase: 'countdown' })} />)
    expect(screen.getByText(/cada punto cuenta por 5/i)).toBeInTheDocument()
  })

  it('muestra el chip en vivo', () => {
    render(<ColombiaHero takeover={takeover({ phase: 'live', score: { col: 1, opp: 0 } })} />)
    expect(screen.getByText(/cada punto cuenta por 5/i)).toBeInTheDocument()
  })

  it('NO muestra el chip en el estado ganó', () => {
    render(<ColombiaHero takeover={takeover({ phase: 'won', score: { col: 2, opp: 1 } })} />)
    expect(screen.queryByText(/cada punto cuenta por 5/i)).not.toBeInTheDocument()
  })

  it('al tocar el chip abre la explicación de la regla', () => {
    render(<ColombiaHero takeover={takeover({ phase: 'countdown' })} />)
    fireEvent.click(screen.getByRole('button', { name: /más información/i }))
    expect(screen.getByText(/5 veces más/i)).toBeInTheDocument()
  })
})
