import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { Thirds } from './Thirds'

describe('Thirds', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-juan' // 12 candidatos, 8 seleccionados en el seed
  })

  it('parte con 8 de 8 y deseleccionar todo deja 0 de 8 (no revierte al server)', async () => {
    renderWithProviders(<Thirds />)
    await screen.findByText('8 de 8 elegidos')
    const selected = screen.getAllByRole('button', { pressed: true })
    expect(selected).toHaveLength(8)
    for (const b of selected) await userEvent.click(b)
    await screen.findByText('0 de 8 elegidos')
  })

  it('con 8 elegidos, los candidatos no elegidos quedan deshabilitados (tope de 8)', async () => {
    renderWithProviders(<Thirds />)
    await screen.findByText('8 de 8 elegidos')
    const unselected = screen.getAllByRole('button', { pressed: false })
    expect(unselected).toHaveLength(4) // 12 candidatos − 8 elegidos
    for (const b of unselected) expect(b).toBeDisabled()
  })

  it('guarda los 8 terceros y muestra confirmación (modo standalone)', async () => {
    renderWithProviders(<Thirds />)
    await screen.findByText('8 de 8 elegidos')
    const save = screen.getByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByText('Guardado')
  })
})
