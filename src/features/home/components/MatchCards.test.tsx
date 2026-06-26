import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../../test/utils'
import { db } from '../../../mocks/db'
import { setNow } from '../../../lib/clock'
import { MatchCards } from './MatchCards'

describe('MatchCards', () => {
  it('muestra TODOS los partidos del día (12-jun: 3 partidos de grupos)', async () => {
    seedSession('p-juan')
    setNow('2026-06-12T18:00:00.000Z') // hoy en Bogotá = 12-jun
    renderWithProviders(<MatchCards />)

    expect(await screen.findByText('Partidos de hoy')).toBeInTheDocument()
    // gm-b1 (finalizado 2–1), gm-b2 (en vivo 1–1), gm-c1 (por jugar) — todos el 12-jun
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
    expect(screen.getByText('En juego ahora')).toBeInTheDocument()
    expect(screen.getByText('Por jugar')).toBeInTheDocument()
    expect(screen.getByText('2–1')).toBeInTheDocument()
    expect(screen.getByText('1–1')).toBeInTheDocument()
    expect(screen.getByText('EN VIVO')).toBeInTheDocument()
    expect(screen.getByText('FINAL')).toBeInTheDocument()
    expect(screen.getAllByText(/Grupo B/)).toHaveLength(2)
    expect(screen.getByText(/Grupo C/)).toBeInTheDocument()
  })

  it('incluye partidos KO en la lista del día (29-jun)', async () => {
    seedSession('p-juan')
    setNow('2026-06-29T18:00:00.000Z') // hoy = 29-jun: juega ko-r32-open-1
    renderWithProviders(<MatchCards />)

    expect(await screen.findByText('Partidos de hoy')).toBeInTheDocument()
    expect(screen.getByText('Eliminatorias')).toBeInTheDocument()
  })

  it('sin partidos hoy → muestra el próximo partido programado', async () => {
    seedSession('p-juan')
    setNow('2026-06-15T12:00:00.000Z') // 15-jun no hay partidos; el próximo es KO (29-jun)
    renderWithProviders(<MatchCards />)

    expect(await screen.findByText('Próximo partido')).toBeInTheDocument()
    expect(screen.getByText('Siguiente partido')).toBeInTheDocument()
    expect(screen.queryByText('Partidos de hoy')).not.toBeInTheDocument()
  })

  it('sin partidos de grupos ni KO no renderiza nada', async () => {
    seedSession('p-juan')
    db.groupMatches = []
    db.koMatches = []
    const { container } = renderWithProviders(<MatchCards />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
