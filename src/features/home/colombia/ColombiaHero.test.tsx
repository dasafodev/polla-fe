import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../../test/utils'
import { ColombiaHero } from './ColombiaHero'
import type { ColombiaTakeover } from './colombiaTakeover'
import type { KoMatch, KoTeam } from '../../../types/api'

const COL = { id: 'col', name: 'Colombia', code: 'COL', flag: null } as KoTeam
const BRA = { id: 'bra', name: 'Brasil', code: 'BRA', flag: null } as KoTeam

// Partido completo COL vs BRA: al abrir el detalle, el sheet cae a este `initial` (id no sembrado → 404).
const MATCH: KoMatch = {
  id: 'm1',
  externalMatchId: 1,
  matchNumber: 1,
  scheduledAt: '2026-09-01T23:30:00.000Z',
  lockedAt: '2026-09-01T22:00:00.000Z',
  status: 'scheduled',
  locked: false,
  homeTeam: COL,
  awayTeam: BRA,
  homeTeamLabel: null,
  awayTeamLabel: null,
  homeSource: null,
  awaySource: null,
  result: null,
  myPrediction: null,
}

function takeover(over: Partial<ColombiaTakeover>): ColombiaTakeover {
  return {
    phase: 'countdown',
    match: MATCH,
    roundLong: 'Cuartos',
    colombia: COL,
    opponent: BRA,
    kickoffAt: '2026-09-01T23:30:00.000Z',
    score: null,
    ...over,
  }
}

// ColombiaHero ahora lee useAllKoPredictions (tripleRemaining) y monta el KoPredictionSheet:
// necesita providers + sesión.
describe('ColombiaHero — informativo de puntos ×5', () => {
  beforeEach(() => seedSession('p-juan'))

  it('muestra el chip en cuenta regresiva', () => {
    renderWithProviders(<ColombiaHero takeover={takeover({ phase: 'countdown' })} />)
    expect(screen.getByText(/cada punto cuenta por 5/i)).toBeInTheDocument()
  })

  it('muestra el chip en vivo', () => {
    renderWithProviders(<ColombiaHero takeover={takeover({ phase: 'live', score: { col: 1, opp: 0 } })} />)
    expect(screen.getByText(/cada punto cuenta por 5/i)).toBeInTheDocument()
  })

  it('NO muestra el chip en el estado ganó', () => {
    renderWithProviders(<ColombiaHero takeover={takeover({ phase: 'won', score: { col: 2, opp: 1 } })} />)
    expect(screen.queryByText(/cada punto cuenta por 5/i)).not.toBeInTheDocument()
  })

  it('al tocar el chip abre la explicación de la regla', async () => {
    renderWithProviders(<ColombiaHero takeover={takeover({ phase: 'countdown' })} />)
    await userEvent.click(screen.getByRole('button', { name: /más información/i }))
    expect(screen.getByText(/5 veces más/i)).toBeInTheDocument()
  })
})

describe('ColombiaHero — tocar la card abre el detalle de pronóstico', () => {
  beforeEach(() => seedSession('p-juan'))

  it('cuenta regresiva: la card abre el detalle con el informativo ×5', async () => {
    renderWithProviders(<ColombiaHero takeover={takeover({ phase: 'countdown' })} />)
    await userEvent.click(screen.getByRole('button', { name: /Pronosticar el marcador de Colombia contra Brasil/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })
    expect(await within(dialog).findByText(/cada punto que ganes aquí cuenta por 5/i)).toBeInTheDocument()
  })

  it('estado ganó: la card sigue abriendo el detalle', async () => {
    renderWithProviders(<ColombiaHero takeover={takeover({ phase: 'won', score: { col: 2, opp: 1 } })} />)
    await userEvent.click(screen.getByRole('button', { name: /Ver el detalle de Colombia contra Brasil/i }))
    expect(await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })).toBeInTheDocument()
  })
})
