import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('cuando open=true muestra el contenido en un dialog con su título', () => {
    render(
      <Sheet open onClose={() => {}} title="Caballo oscuro">
        <p>contenido</p>
      </Sheet>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Caballo oscuro' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('llama onClose al presionar Escape', async () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose} title="X">
        <p>c</p>
      </Sheet>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cuando open=false no renderiza el dialog', () => {
    render(
      <Sheet open={false} onClose={() => {}} title="X">
        <p>c</p>
      </Sheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
