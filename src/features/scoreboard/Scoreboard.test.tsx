import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, seedSession } from '../../test/utils'
import { server } from '../../mocks/server'
import { Scoreboard } from './Scoreboard'

describe('Scoreboard', () => {
  beforeEach(() => {
    seedSession('p-pedro') // pedro: #4 (fuera del podio) → fila resaltada "TÚ"
  })

  it('muestra el podio con el top 3 y resalta mi fila en la lista', async () => {
    renderWithProviders(<Scoreboard />)
    await screen.findByRole('button', { name: /Juan/i })
    expect(screen.getByRole('button', { name: /María/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Luis/i })).toBeInTheDocument()
    const pedro = screen.getByRole('button', { name: /Pedro/i })
    expect(within(pedro).getByText('TÚ')).toBeInTheDocument()
  })

  it('al tocar un jugador abre el detalle con su desglose por categoría', async () => {
    renderWithProviders(<Scoreboard />)
    await userEvent.click(await screen.findByRole('button', { name: /Juan/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Juan' })
    await within(dialog).findByText('584') // total
    expect(within(dialog).getByText('480')).toBeInTheDocument() // grupos
    expect(within(dialog).getByText('14')).toBeInTheDocument() // eliminatorias
    expect(within(dialog).getByText('80')).toBeInTheDocument() // terceros
    expect(within(dialog).getByText('+15')).toBeInTheDocument() // caballo oscuro
    expect(within(dialog).getByText('-5')).toBeInTheDocument() // decepción
  })
})

describe('Scoreboard — usuario fuera del top 10', () => {
  const top10 = Array.from({ length: 10 }, (_, i) => ({
    rank: i + 1, participant: { id: `p-top${i + 1}`, name: `Top ${i + 1}` }, total: 200 - i, prize: null,
  }))
  const mockScoreboard = (...rest: typeof top10) =>
    server.use(
      http.get('/api/scoreboard', () =>
        HttpResponse.json({ updatedAt: '2026-06-06T12:00:00.000Z', data: [...top10, ...rest] }),
      ),
    )

  beforeEach(() => seedSession('p-pedro'))

  it('me muestra al final con mi posición real tras un separador cuando hay hueco', async () => {
    mockScoreboard({ rank: 27, participant: { id: 'p-pedro', name: 'Pedro' }, total: 12, prize: null })
    renderWithProviders(<Scoreboard />)
    const pedro = await screen.findByRole('button', { name: /Pedro/i })
    expect(within(pedro).getByText('TÚ')).toBeInTheDocument()
    expect(within(pedro).getByText('27')).toBeInTheDocument() // posición real, no "11"
    expect(screen.getByTestId('rank-gap')).toBeInTheDocument()
  })

  it('cuando soy exactamente #11 (ranks contiguos) me muestra sin separador', async () => {
    mockScoreboard({ rank: 11, participant: { id: 'p-pedro', name: 'Pedro' }, total: 12, prize: null })
    renderWithProviders(<Scoreboard />)
    const pedro = await screen.findByRole('button', { name: /Pedro/i })
    expect(within(pedro).getByText('TÚ')).toBeInTheDocument()
    expect(screen.queryByTestId('rank-gap')).not.toBeInTheDocument()
  })
})
