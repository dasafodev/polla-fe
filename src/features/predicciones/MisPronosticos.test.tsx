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

  it('torneo no iniciado: header con % de avance y tab Grupos por defecto', async () => {
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('Grupo A')
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terceros' })).toBeInTheDocument()
  })

  it('cambia a la tab Terceros al tocarla', async () => {
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('Grupo A')
    await userEvent.click(screen.getByRole('button', { name: 'Terceros' }))
    await screen.findByText('Equipo A3')
    // El panel de Grupos se desmontó: su link "Editar Grupo A" ya no existe.
    // (No uso el texto "Grupo A" porque Terceros también lo muestra como grupo de origen.)
    expect(screen.queryByRole('link', { name: 'Editar Grupo A' })).not.toBeInTheDocument()
  })

  it('torneo iniciado: header muestra el total de puntos', async () => {
    setNow(db.tournamentStartAt)
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('584 pts')
  })
})
