import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../test/utils'
import { GruposPanel } from './GruposPanel'

describe('GruposPanel', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('locked: subtotal de puntos, 12 grupos en mi orden y marcas EXACTO', async () => {
    renderWithProviders(<GruposPanel locked />)
    await screen.findByText('Grupo A')
    await screen.findByText('+360 pts') // subtotal (espera al breakdown)
    expect(screen.getAllByText(/^Grupo [A-L]$/)).toHaveLength(12)
    expect(screen.getByText('Equipo A1')).toBeInTheDocument()
    expect(screen.getAllByText('EXACTO')).toHaveLength(48) // 12 grupos × 4
    expect(screen.getByRole('link', { name: 'Editar Grupo A' })).toHaveAttribute('href', '/predicciones/grupos')
  })

  it('sin cierre: muestra avance y oculta marcas', async () => {
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findByText('Grupo A')
    expect(screen.getByText('12/12 completos')).toBeInTheDocument()
    expect(screen.queryByText('EXACTO')).not.toBeInTheDocument()
  })

  it('grupo sin ordenar muestra estado vacío', async () => {
    seedSession('p-luis') // solo 3 grupos completos
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findByText('Grupo A')
    expect(screen.getByText('3/12 completos')).toBeInTheDocument()
    expect(screen.getAllByText('Sin ordenar')).toHaveLength(9)
  })
})
