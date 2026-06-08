import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { Thirds } from './Thirds'

// Regresión: deseleccionar todo debe dejar 0/8, no revertir a la selección sembrada del server
// (antes picked=[] se confundía con "sin ediciones" y reaparecían los 8).
describe('Thirds', () => {
  it('deseleccionar todos los terceros deja 0/8 (no revierte al server)', async () => {
    db.currentSessionId = 'p-juan' // juan: 8 terceros seleccionados en el seed
    renderWithProviders(<Thirds />)
    await screen.findByRole('heading', { name: /Mejores terceros \(8\/8\)/i })
    const checked = screen.getAllByRole('checkbox').filter((c) => (c as HTMLInputElement).checked)
    expect(checked).toHaveLength(8)
    for (const c of checked) await userEvent.click(c)
    await screen.findByRole('heading', { name: /Mejores terceros \(0\/8\)/i })
  })
})
