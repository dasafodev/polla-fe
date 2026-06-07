import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, makeFakeIdToken } from '../../test/utils'

// Mock de GoogleLogin: un botón que dispara onSuccess con el credential del último set.
let nextCredential = ''
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: nextCredential })}>Google</button>
  ),
}))

import { Login } from './Login'

beforeEach(() => { nextCredential = '' })

describe('Login', () => {
  it('usuario existente → navega a home', async () => {
    nextCredential = makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' })
    renderWithProviders(<Login />, { route: '/login' })
    await userEvent.click(screen.getByText('Google'))
    await waitFor(() => expect(screen.getByText(/redirigiendo/i)).toBeInTheDocument())
  })

  it('usuario sin cuenta → muestra el formulario de signup', async () => {
    nextCredential = makeFakeIdToken({ sub: 'sub-nuevo', email: 'nuevo@gmail.com', name: 'Nuevo' })
    renderWithProviders(<Login />, { route: '/login' })
    await userEvent.click(screen.getByText('Google'))
    await waitFor(() => expect(screen.getByLabelText(/código/i)).toBeInTheDocument())
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument()
  })
})
