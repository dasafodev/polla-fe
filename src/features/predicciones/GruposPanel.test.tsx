import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(screen.getByRole('button', { name: 'Editar Grupo A' })).toBeInTheDocument()
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

  it('tap en un grupo editable abre el editor de solo ese grupo', async () => {
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findByText('Grupo A')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Editar Grupo A' }))

    const dialog = await screen.findByRole('dialog', { name: 'Grupo A' })
    expect(within(dialog).getByText('Equipo A1')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /guardar grupo/i })).toBeInTheDocument()
  })
})
