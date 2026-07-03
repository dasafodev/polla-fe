import { describe, it, expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('tocar un partido KO abre el mismo sheet de pronóstico que Predicciones', async () => {
    seedSession('p-juan')
    setNow('2026-06-29T14:00:00.000Z') // 29-jun antes del cierre (15:30Z): ko-r32-open-1 G1 vs H1, abierto
    renderWithProviders(<MatchCards />)

    await screen.findByText('Eliminatorias')
    await userEvent.click(screen.getByRole('button', { name: 'G1 vs H1' }))

    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })
    expect(within(dialog).getByText('¿Quién avanza?')).toBeInTheDocument()
    expect(within(dialog).getByText('Tu marcador')).toBeInTheDocument() // form de ingreso KO (autoguarda, sin botón)
  })

  it('muestra el pronóstico del usuario en la card de un partido KO', async () => {
    seedSession('p-pedro') // pedro ya pronosticó ko-r32-open-1 (1–0, pasa G1)
    setNow('2026-06-29T14:00:00.000Z') // hoy = 29-jun: juega ko-r32-open-1 (G1 vs H1)
    renderWithProviders(<MatchCards />)

    const card = await screen.findByRole('button', { name: 'G1 vs H1' })
    expect(within(card).getByText('Tu pronóstico')).toBeInTheDocument()
    expect(within(card).getByText('1–0')).toBeInTheDocument()
    expect(within(card).getByText(/pasa G1/)).toBeInTheDocument()
  })

  it('los partidos de grupos no abren el sheet (no son interactivos)', async () => {
    seedSession('p-juan')
    setNow('2026-06-12T18:00:00.000Z') // 12-jun: solo partidos de grupos
    renderWithProviders(<MatchCards />)

    await screen.findByText('Partidos de hoy')
    // Las cards de grupos no son botones → no hay rol button entre los partidos del día.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
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
