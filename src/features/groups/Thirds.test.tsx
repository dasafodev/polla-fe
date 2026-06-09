import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Route, Routes } from 'react-router-dom'
import { renderWithProviders, seedSession } from '../../test/utils'
import { Thirds } from './Thirds'

// Hub con un link al editor: navegar por PUSH deja historial para que el back/guardar vuelvan atrás.
function renderRouted() {
  return renderWithProviders(
    <Routes>
      <Route path="/predicciones" element={<Link to="/predicciones/terceros">ir a terceros</Link>} />
      <Route path="/predicciones/terceros" element={<Thirds />} />
    </Routes>,
    { route: '/predicciones' },
  )
}

describe('Thirds', () => {
  beforeEach(() => {
    seedSession('p-juan') // 12 candidatos, 8 seleccionados en el seed
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

  it('guarda los 8 terceros y vuelve atrás (modo standalone)', async () => {
    renderRouted()
    await userEvent.click(screen.getByRole('link', { name: 'ir a terceros' }))
    await screen.findByText('8 de 8 elegidos')
    const save = screen.getByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByRole('link', { name: 'ir a terceros' }) // volvió al hub
    expect(screen.queryByRole('button', { name: 'Guardar' })).toBeNull()
  })

  it('el botón de volver regresa al hub (modo standalone)', async () => {
    renderRouted()
    await userEvent.click(screen.getByRole('link', { name: 'ir a terceros' }))
    await screen.findByText('8 de 8 elegidos')
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByRole('link', { name: 'ir a terceros' })
  })
})
