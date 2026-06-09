import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../test/utils'
import { PowerupsPanel } from './PowerupsPanel'

describe('PowerupsPanel', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('locked: subtotal y puntos de caballo y decepción', async () => {
    renderWithProviders(<PowerupsPanel locked />)
    await screen.findByText('Equipo A4') // caballo oscuro
    expect(screen.getByText('+13 pts')).toBeInTheDocument()
    expect(screen.getByText('+16')).toBeInTheDocument()
    expect(screen.getByText('Equipo A1')).toBeInTheDocument() // decepción
    expect(screen.getByText('-3')).toBeInTheDocument()
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/predicciones/powerups')
  })

  it('sin cierre: muestra conteo y oculta puntos', async () => {
    renderWithProviders(<PowerupsPanel locked={false} />)
    await screen.findByText('Equipo A4')
    expect(screen.getByText('2/2 elegidos')).toBeInTheDocument()
    expect(screen.queryByText('+16')).not.toBeInTheDocument()
  })
})
