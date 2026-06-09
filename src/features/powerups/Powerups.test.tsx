import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../test/utils'
import { Powerups } from './Powerups'

describe('Powerups', () => {
  it('crea powerups eligiendo la revelación y la decepción (usuario sin powerups)', async () => {
    seedSession('p-luis') // sin powerups → modo create
    renderWithProviders(<Powerups />)

    await userEvent.click(await screen.findByRole('button', { name: /La revelación/i }))
    const dhSheet = await screen.findByRole('dialog', { name: 'La revelación' })
    await userEvent.click(within(dhSheet).getByRole('button', { name: /Equipo A2/i })) // A2 no es top8

    await userEvent.click(screen.getByRole('button', { name: /La decepción/i }))
    const disSheet = await screen.findByRole('dialog', { name: 'La decepción' })
    await userEvent.click(within(disSheet).getByRole('button', { name: /Equipo A1/i })) // A1 es top8

    const save = screen.getByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByText('Guardado')
  })

  it('habilita guardar de entrada cuando ya hay powerups (usuario con powerups)', async () => {
    seedSession('p-juan') // darkHorse tA4 + disappointment tA1 → modo update
    renderWithProviders(<Powerups />)
    const save = await screen.findByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByText('Guardado')
  })
})
