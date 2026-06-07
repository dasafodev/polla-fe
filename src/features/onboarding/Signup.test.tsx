import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, makeFakeIdToken } from '../../test/utils'
import { Signup } from './Signup'

describe('Signup', () => {
  it('rechaza teléfono no E.164 sin llamar al servidor', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(<Signup credential={cred} onNeedRelogin={() => {}} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'OK1234')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '3001234567')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/E\.164/i)
  })

  it('código inexistente muestra el error del servidor', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(<Signup credential={cred} onNeedRelogin={() => {}} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'NOPE00')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '+573001234567')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(await screen.findByText(/no encontrado/i)).toBeInTheDocument()
  })

  it('credential expirado dispara onNeedRelogin', async () => {
    const onNeedRelogin = vi.fn()
    const expired = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N', exp: 1 })
    renderWithProviders(<Signup credential={expired} onNeedRelogin={onNeedRelogin} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'OK1234')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '+573001234567')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(onNeedRelogin).toHaveBeenCalled())
  })
})
