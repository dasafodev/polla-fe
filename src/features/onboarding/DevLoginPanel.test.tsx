import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { DevLoginPanel } from './DevLoginPanel'
import { db } from '../../mocks/db'

describe('DevLoginPanel', () => {
  it('lista los inscritos y entrar como uno abre su sesión', async () => {
    renderWithProviders(<DevLoginPanel />)
    const juanBtn = await screen.findByRole('button', { name: /juan/i })
    await userEvent.click(juanBtn)
    await waitFor(() => expect(db.currentSessionId).toBe('p-juan'))
  })
})
