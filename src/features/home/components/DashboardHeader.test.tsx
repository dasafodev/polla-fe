import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../../test/utils'
import { resetDb } from '../../../mocks/seed'
import { DashboardHeader } from './DashboardHeader'

beforeEach(() => { resetDb(); seedSession('p-juan') })

describe('DashboardHeader', () => {
  it('abre el sheet de reglas desde el menú del avatar', async () => {
    renderWithProviders(<DashboardHeader subtitle="Tu polla" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Tu cuenta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cómo se juega' }))

    expect(screen.getByRole('dialog', { name: 'Cómo se juega' })).toBeInTheDocument()
  })
})
