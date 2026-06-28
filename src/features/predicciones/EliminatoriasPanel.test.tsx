import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../test/utils'
import { EliminatoriasPanel } from './EliminatoriasPanel'

describe('EliminatoriasPanel', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('muestra todas las rondas hasta la final y marca los cruces por definir', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos') // r32 (espera a las queries KO)
    for (const r of ['Octavos', 'Cuartos', 'Semifinal', 'Tercer puesto', 'Final']) {
      expect(screen.getByText(r)).toBeInTheDocument()
    }
    // cuartos/semis/final aún sin clasificados → marcados como "Por definir"
    expect(screen.getAllByText('Por definir').length).toBeGreaterThan(0)
  })

  it('alterna entre vista Lista y Llaves', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    expect(screen.queryByText(/Desliza para ver todas las rondas/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Llaves' }))
    expect(screen.getByText(/Desliza para ver todas las rondas/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Lista' }))
    expect(screen.queryByText(/Desliza para ver todas las rondas/)).not.toBeInTheDocument()
  })

  it('tocar un partido definido abre el sheet de pronóstico', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' })) // ko-r32-open-1 (abierto)

    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })
    expect(within(dialog).getByText('¿Quién avanza?')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Guardar pronóstico' })).toBeInTheDocument()
  })

  it('locked: muestra el subtotal de puntos KO de la fase', async () => {
    renderWithProviders(<EliminatoriasPanel locked />)
    await screen.findByText('Dieciseisavos')
    expect(await screen.findByText('+14 pts')).toBeInTheDocument() // breakdown.ko de juan (sin cambios)
  })
})
