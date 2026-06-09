import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../test/utils'
import { EliminatoriasPanel } from './EliminatoriasPanel'

describe('EliminatoriasPanel', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('locked: secciones por ronda, puntos por partido y partidos sin pronóstico', async () => {
    renderWithProviders(<EliminatoriasPanel locked />)
    await screen.findByText('Dieciseisavos') // r32 (espera a las queries KO)
    await screen.findByText('+14 pts') // subtotal de fase (espera al breakdown)
    expect(screen.getByText('Octavos')).toBeInTheDocument() // r16
    expect(screen.getAllByText('+5')).toHaveLength(2) // r32-1 y r32-2 (exactos: 2 avanza + 3 exacto)
    expect(screen.getAllByText('Sin pronóstico')).toHaveLength(6) // 8 r32 − 2 pronosticados
    expect(screen.getByRole('link', { name: 'Equipo A1 vs Equipo B1' })).toHaveAttribute(
      'href',
      '/eliminatorias/partido/ko-r32-1',
    )
  })

  it('sin cierre: conteo de pronósticos y sin puntos/resultados', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    expect(screen.getByText('3 pronósticos')).toBeInTheDocument()
    expect(screen.queryByText('+14 pts')).not.toBeInTheDocument()
    expect(screen.queryByText('+5')).not.toBeInTheDocument()
  })
})
