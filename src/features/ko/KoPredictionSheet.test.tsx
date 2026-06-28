import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../test/utils'
import { db } from '../../mocks/db'
import { EliminatoriasPanel } from '../predicciones/EliminatoriasPanel'

// Se ejercita a través del panel (integración realista): tocar un partido abre el sheet.
describe('KoPredictionSheet — ingreso de pronóstico KO', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('crea un pronóstico: marcador + quién avanza, y persiste', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' })) // ko-r32-open-1
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    // marcador 1-0: sube un gol al local
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sumar gol a Equipo G1' }))
    // quién avanza (requerido): el botón con nombre exacto del equipo, no los del stepper
    await userEvent.click(within(dialog).getByRole('button', { name: 'Equipo G1' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar pronóstico' }))

    await within(dialog).findByText('Pronóstico guardado')
    const pred = db.koPredictions.find((p) => p.participantId === 'p-juan' && p.matchId === 'ko-r32-open-1')
    expect(pred).toMatchObject({ scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tG1', tripleActive: false })
  })

  it('no permite guardar sin elegir quién avanza', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })
    expect(within(dialog).getByRole('button', { name: 'Guardar pronóstico' })).toBeDisabled()
  })

  it('partido finalizado: solo lectura con resultado real, sin botón de guardar', async () => {
    renderWithProviders(<EliminatoriasPanel locked />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo A1 vs Equipo B1' })) // ko-r32-1 (finished)
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    expect(within(dialog).getByText('Tu pronóstico')).toBeInTheDocument()
    expect(within(dialog).getByText('Resultado real')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Guardar pronóstico' })).not.toBeInTheDocument()
  })
})
