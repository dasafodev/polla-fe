import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../test/utils'
import { db } from '../../mocks/db'
import { setNow } from '../../lib/clock'
import { MisPronosticos } from './MisPronosticos'

describe('MisPronosticos', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('torneo no iniciado: header con % de avance y tab Eliminatorias por defecto', async () => {
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('Dieciseisavos') // el panel de Eliminatorias abre por defecto
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terceros' })).toBeInTheDocument()
  })

  it('cambia a la tab Terceros al tocarla', async () => {
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('Dieciseisavos') // espera a que el panel por defecto (Eliminatorias) cargue
    await userEvent.click(screen.getByRole('button', { name: 'Terceros' }))
    await screen.findByText('Equipo A3')
    // El panel de Eliminatorias se desmontó: su ronda "Dieciseisavos" ya no existe.
    expect(screen.queryByText('Dieciseisavos')).not.toBeInTheDocument()
  })

  it('torneo iniciado: el header ya no muestra el total general de puntos', async () => {
    setNow(db.tournamentStartAt)
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('Dieciseisavos') // el panel por defecto (Eliminatorias) cargó
    expect(screen.queryByText('584 pts')).not.toBeInTheDocument()
    expect(screen.queryByText(/\d+ pts$/)).not.toBeInTheDocument() // sin contabilización general
  })
})
