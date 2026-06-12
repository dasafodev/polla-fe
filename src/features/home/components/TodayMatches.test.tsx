import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../../test/utils'
import { setNow } from '../../../lib/clock'
import { TodayMatchesCard } from './TodayMatches'

describe('TodayMatchesCard', () => {
  it('muestra los partidos del día Colombia con marcador, estado y hora', async () => {
    seedSession('p-juan')
    setNow('2026-06-12T21:00:00.000Z') // 4:00 p. m. del 12-jun en Bogotá
    renderWithProviders(<TodayMatchesCard />)

    expect(await screen.findByText('Partidos de hoy')).toBeInTheDocument()
    expect(screen.getByText('2-1')).toBeInTheDocument() // gm-b1 terminado
    expect(screen.getByText('FINAL')).toBeInTheDocument()
    expect(screen.getByText('1-1')).toBeInTheDocument() // gm-b2 en vivo
    expect(screen.getByText('EN VIVO')).toBeInTheDocument()
    expect(screen.getByText('C1')).toBeInTheDocument() // gm-c1 programado hoy (00:30Z del 13)
    // los partidos del 11-jun no aparecen
    expect(screen.queryByText('A1')).not.toBeInTheDocument()
  })

  it('no renderiza nada cuando hoy no hay partidos', async () => {
    seedSession('p-juan')
    setNow('2026-06-20T21:00:00.000Z')
    const { container } = renderWithProviders(<TodayMatchesCard />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
