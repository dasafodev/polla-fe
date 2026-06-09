import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Route, Routes } from 'react-router-dom'
import { renderWithProviders, seedSession } from '../../test/utils'
import { Powerups } from './Powerups'

// Hub con un link al editor: navegar por PUSH deja historial para que el guardar vuelva atrás.
function renderRouted() {
  return renderWithProviders(
    <Routes>
      <Route path="/predicciones" element={<Link to="/predicciones/powerups">ir a powerups</Link>} />
      <Route path="/predicciones/powerups" element={<Powerups />} />
    </Routes>,
    { route: '/predicciones' },
  )
}

describe('Powerups', () => {
  it('crea powerups eligiendo la revelación y la decepción y vuelve atrás (usuario sin powerups)', async () => {
    seedSession('p-luis') // sin powerups → modo create
    renderRouted()
    await userEvent.click(screen.getByRole('link', { name: 'ir a powerups' }))

    await userEvent.click(await screen.findByRole('button', { name: /La revelación/i }))
    const dhSheet = await screen.findByRole('dialog', { name: 'La revelación' })
    await userEvent.click(within(dhSheet).getByRole('button', { name: /Equipo A2/i })) // A2 no es top8

    await userEvent.click(screen.getByRole('button', { name: /La decepción/i }))
    const disSheet = await screen.findByRole('dialog', { name: 'La decepción' })
    await userEvent.click(within(disSheet).getByRole('button', { name: /Equipo A1/i })) // A1 es top8

    const save = screen.getByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByRole('link', { name: 'ir a powerups' }) // volvió al hub
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
  })

  it('actualiza y vuelve atrás cuando ya hay powerups (usuario con powerups)', async () => {
    seedSession('p-juan') // darkHorse tA4 + disappointment tA1 → modo update
    renderRouted()
    await userEvent.click(screen.getByRole('link', { name: 'ir a powerups' }))
    const save = await screen.findByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByRole('link', { name: 'ir a powerups' }) // volvió al hub
  })
})
