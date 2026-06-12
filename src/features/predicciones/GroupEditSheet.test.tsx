import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../test/utils'
import { setNow } from '../../lib/clock'
import { GroupEditSheet } from './GroupEditSheet'

describe('GroupEditSheet', () => {
  it('editable: abre solo ese grupo con reordenamiento y guarda', async () => {
    seedSession('p-juan')
    const onClose = vi.fn()
    renderWithProviders(<GroupEditSheet groupId="g-A" locked={false} onClose={onClose} />)

    const dialog = await screen.findByRole('dialog', { name: 'Grupo A' })
    expect(within(dialog).getByText('Equipo A1')).toBeInTheDocument()
    // editable: sin marcas de resultado ni nota de cierre
    expect(within(dialog).queryByText('EXACTO')).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: /guardar grupo/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })

  it('cerrado: solo lectura con resultados y sin botón guardar', async () => {
    seedSession('p-juan')
    renderWithProviders(<GroupEditSheet groupId="g-A" locked onClose={() => {}} />)

    const dialog = await screen.findByRole('dialog', { name: 'Grupo A' })
    await within(dialog).findByText('Equipo A1')
    expect(within(dialog).getAllByText('EXACTO')).toHaveLength(4)
    expect(within(dialog).getByText(/predicciones est[aá]n cerradas/i)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /guardar grupo/i })).not.toBeInTheDocument()
  })

  it('cerrado post-lock: muestra la leyenda del consenso', async () => {
    setNow('2026-06-12T00:00:00.000Z')
    seedSession('p-juan')
    renderWithProviders(<GroupEditSheet groupId="g-A" locked onClose={() => {}} />)
    const dialog = await screen.findByRole('dialog', { name: 'Grupo A' })
    await within(dialog).findByText(/jugadores de la polla que coincidió contigo/i)
  })

  it('groupId null: no abre el sheet', () => {
    seedSession('p-juan')
    renderWithProviders(<GroupEditSheet groupId={null} locked={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
