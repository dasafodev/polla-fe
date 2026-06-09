import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../test/utils'
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
    await within(dialog).findByText('463') // total
    expect(within(dialog).getByText('360')).toBeInTheDocument() // grupos
    expect(within(dialog).getByText('50')).toBeInTheDocument() // eliminatorias
    expect(within(dialog).getByText('40')).toBeInTheDocument() // terceros
    expect(within(dialog).getByText('+16')).toBeInTheDocument() // caballo oscuro
    expect(within(dialog).getByText('-3')).toBeInTheDocument() // decepción
  })
})
