import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, makeFakeIdToken } from '../../test/utils'
import { db } from '../../mocks/db'

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

  it('link con code + phone → entra directo y crea la cuenta sin formulario', async () => {
    nextCredential = makeFakeIdToken({ sub: 'sub-nuevo', email: 'nuevo@gmail.com', name: 'Nuevo' })
    renderWithProviders(<Login />, { route: '/login?code=OK1234&phone=%2B573001234567' })
    await userEvent.click(screen.getByText('Google'))
    await waitFor(() => {
      const p = db.participants.find((x) => x.googleSub === 'sub-nuevo')
      expect(p?.phone).toBe('+573001234567')
    })
    expect(screen.queryByRole('button', { name: /crear cuenta/i })).not.toBeInTheDocument()
  })

  it('link con el + crudo (se decodifica como espacio) → igual crea la cuenta', async () => {
    nextCredential = makeFakeIdToken({ sub: 'sub-nuevo', email: 'nuevo@gmail.com', name: 'Nuevo' })
    renderWithProviders(<Login />, { route: '/login?code=OK1234&phone=+573001234567' })
    await userEvent.click(screen.getByText('Google'))
    await waitFor(() => {
      const p = db.participants.find((x) => x.googleSub === 'sub-nuevo')
      expect(p?.phone).toBe('+573001234567')
    })
  })
})
