import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RulesSheet } from './RulesSheet'

describe('RulesSheet', () => {
  it('cuando open=true muestra las reglas en un dialog titulado "Cómo se juega"', () => {
    render(<RulesSheet open onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Cómo se juega' })).toBeInTheDocument()
  })

  it('usa los nombres actuales de los pálpitos (La revelación / La decepción)', () => {
    render(<RulesSheet open onClose={() => {}} />)
    expect(screen.getByText('La revelación')).toBeInTheDocument()
    expect(screen.getByText('La decepción')).toBeInTheDocument()
  })

  it('muestra los premios 800.000 / 300.000 / 100.000', () => {
    render(<RulesSheet open onClose={() => {}} />)
    expect(screen.getByText('$800.000')).toBeInTheDocument()
    expect(screen.getByText('$300.000')).toBeInTheDocument()
    expect(screen.getByText('$100.000')).toBeInTheDocument()
  })

  it('cuando open=false no renderiza el dialog', () => {
    render(<RulesSheet open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('llama onClose al presionar Escape', async () => {
    const onClose = vi.fn()
    render(<RulesSheet open onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
