import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../../test/utils'
import { db } from '../../../mocks/db'
import { MatchCards } from './MatchCards'
import type { KoMatch } from '../../../types/api'

const koNext: KoMatch = {
  id: 'ko-1', externalMatchId: 73, matchNumber: 1,
  scheduledAt: '2026-06-29T16:00:00.000Z', lockedAt: '2026-06-29T15:30:00.000Z',
  status: 'scheduled', locked: false,
  homeTeam: { id: 'col', name: 'Colombia', code: 'COL', flag: null },
  awayTeam: { id: 'bra', name: 'Brasil', code: 'BRA', flag: null },
  homeTeamLabel: null, awayTeamLabel: null, result: null, myPrediction: null,
}

describe('MatchCards', () => {
  it('muestra la card del partido en vivo y la del último terminado', async () => {
    seedSession('p-juan')
    renderWithProviders(<MatchCards koNext={null} />)

    expect(await screen.findByText('En juego ahora')).toBeInTheDocument()
    expect(screen.getByText('1–1')).toBeInTheDocument() // gm-b2 en vivo
    expect(screen.getByText('EN VIVO')).toBeInTheDocument()
    expect(screen.getByText('Último partido')).toBeInTheDocument()
    expect(screen.getByText('2–1')).toBeInTheDocument() // gm-b1 terminado
    expect(screen.getByText('FINAL')).toBeInTheDocument()
    expect(screen.getAllByText(/Grupo B/)).toHaveLength(2)
  })

  it('sin partidos de grupos cae al próximo partido KO', async () => {
    seedSession('p-juan')
    db.groupMatches = []
    renderWithProviders(<MatchCards koNext={koNext} />)

    expect(await screen.findByText('Siguiente partido')).toBeInTheDocument()
    expect(screen.getByText('COL')).toBeInTheDocument()
    expect(screen.getByText('BRA')).toBeInTheDocument()
    expect(screen.getByText('Eliminatorias')).toBeInTheDocument()
    expect(screen.queryByText('Último partido')).not.toBeInTheDocument()
  })

  it('sin partidos de grupos ni KO no renderiza nada', async () => {
    seedSession('p-juan')
    db.groupMatches = []
    const { container } = renderWithProviders(<MatchCards koNext={null} />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
