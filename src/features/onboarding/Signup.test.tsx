import { StrictMode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, makeFakeIdToken } from '../../test/utils'
import { db } from '../../mocks/db'
import { Signup } from './Signup'

const navigateSpy = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateSpy }
})

beforeEach(() => navigateSpy.mockClear())

describe('Signup', () => {
  it('rechaza teléfono inválido (muy corto) sin llamar al servidor', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(<Signup credential={cred} onNeedRelogin={() => {}} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'OK1234')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '12')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/número de teléfono válido/i)
  })

  it('código inexistente muestra el error del servidor (con país por defecto +57)', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(<Signup credential={cred} onNeedRelogin={() => {}} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'NOPE00')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '3001234567')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(await screen.findByText(/no encontrado/i)).toBeInTheDocument()
  })

  it('credential expirado dispara onNeedRelogin', async () => {
    const onNeedRelogin = vi.fn()
    const expired = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N', exp: 1 })
    renderWithProviders(<Signup credential={expired} onNeedRelogin={onNeedRelogin} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'OK1234')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '3001234567')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(onNeedRelogin).toHaveBeenCalled())
  })

  it('con código en el link (presetCode) oculta el campo y solo pide teléfono', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(<Signup credential={cred} presetCode="OK1234" onNeedRelogin={() => {}} />)
    expect(screen.queryByLabelText(/código/i)).not.toBeInTheDocument()
    expect(screen.getByText(/invitación aplicada/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument()
  })

  it('con code + phone en el link entra directo, sin formulario, y crea la cuenta con ese teléfono', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(
      <Signup credential={cred} presetCode="OK1234" presetPhone="+573001234567" onNeedRelogin={() => {}} />,
    )
    // No se muestra el formulario: se intenta entrar directo.
    expect(screen.queryByRole('button', { name: /crear cuenta/i })).not.toBeInTheDocument()
    expect(screen.getByText(/entrando/i)).toBeInTheDocument()
    // El signup llega al backend con el teléfono del link.
    await waitFor(() => {
      const p = db.participants.find((x) => x.googleSub === 'sub-n')
      expect(p?.phone).toBe('+573001234567')
    })
    expect(db.invitations.find((i) => i.code === 'OK1234')?.usedByParticipantId).toBeTruthy()
  })

  it('si el auto-submit falla (código usado) cae al formulario prellenado con el error', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(
      <Signup credential={cred} presetCode="USED99" presetPhone="+573001234567" onNeedRelogin={() => {}} />,
    )
    // Tras el rechazo del backend aparece el formulario para reintentar.
    expect(await screen.findByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
    expect(screen.getByText(/ya utilizado o expirado/i)).toBeInTheDocument()
    // El teléfono quedó prellenado (Colombia +57 → 3001234567).
    expect(screen.getByLabelText(/teléfono/i)).toHaveValue('3001234567')
  })

  it('bajo StrictMode el auto-submit navega a /onboarding (no se queda en Entrando…)', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-strict', email: 's@x.com', name: 'S' })
    renderWithProviders(
      <StrictMode>
        <Signup credential={cred} presetCode="OK1234" presetPhone="+573001234567" onNeedRelogin={() => {}} />
      </StrictMode>,
    )
    await waitFor(() =>
      expect(db.participants.find((x) => x.googleSub === 'sub-strict')).toBeTruthy(),
    )
    await waitFor(() => expect(navigateSpy).toHaveBeenCalledWith('/onboarding'))
  })

  it('con phone inválido en el link no auto-envía: muestra el formulario', () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(
      <Signup credential={cred} presetCode="OK1234" presetPhone="123" onNeedRelogin={() => {}} />,
    )
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
    expect(screen.queryByText(/entrando/i)).not.toBeInTheDocument()
  })
})
