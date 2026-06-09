import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../test/utils'
import { db } from '../../mocks/db'
import { TercerosPanel } from './TercerosPanel'

describe('TercerosPanel', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('locked: subtotal, 8 elegidos y marca Clasificó', async () => {
    renderWithProviders(<TercerosPanel locked />)
    await screen.findByText('Equipo A3')
    await screen.findByText('+40 pts') // subtotal (espera al breakdown)
    expect(screen.getAllByText('Clasificó')).toHaveLength(8)
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/predicciones/terceros')
  })

  it('sin cierre: muestra conteo y oculta marcas', async () => {
    renderWithProviders(<TercerosPanel locked={false} />)
    await screen.findByText('Equipo A3')
    expect(screen.getByText('8/8 elegidos')).toBeInTheDocument()
    expect(screen.queryByText('Clasificó')).not.toBeInTheDocument()
  })

  it('un elegido que no fue tercero oficial muestra "No clasificó"', async () => {
    db.officialBestThirds = ['tA3', 'tB3', 'tC3', 'tD3', 'tE3', 'tF3', 'tG3', 'tZZ'] // excluye tH3
    renderWithProviders(<TercerosPanel locked />)
    await screen.findByText('Equipo A3')
    expect(screen.getAllByText('Clasificó')).toHaveLength(7)
    expect(screen.getByText('No clasificó')).toBeInTheDocument()
  })
})
