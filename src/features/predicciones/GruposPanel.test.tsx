import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../test/utils'
import { setNow } from '../../lib/clock'
import { GruposPanel } from './GruposPanel'

describe('GruposPanel', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('post-lock: muestra la leyenda del consenso una sola vez, arriba', async () => {
    setNow('2026-06-12T00:00:00.000Z')
    renderWithProviders(<GruposPanel locked />)
    await screen.findByText('Grupo A')
    expect(screen.getAllByText(/jugadores de la polla que coincidió contigo/i)).toHaveLength(1)
  })

  it('pre-lock: no muestra la leyenda (sin datos de consenso)', async () => {
    renderWithProviders(<GruposPanel locked />)
    await screen.findByText('Grupo A')
    expect(screen.queryByText(/jugadores de la polla que coincidió contigo/i)).not.toBeInTheDocument()
  })

  it('locked: subtotal de puntos, 12 grupos en mi orden y los aciertos muestran +puntos', async () => {
    renderWithProviders(<GruposPanel locked />)
    await screen.findByText('Grupo A')
    await screen.findByText('+480 pts') // subtotal (espera al breakdown)
    expect(screen.getAllByText(/^Grupo [A-L]$/)).toHaveLength(12)
    expect(screen.getByText('Equipo A1')).toBeInTheDocument()
    // El acierto sale del standing de /groups: en el seed solo A y B jugaron → 8 exactos, +5 c/u.
    expect(await screen.findAllByText('+5')).toHaveLength(8)
    expect(screen.queryByText('EXACTO')).not.toBeInTheDocument()
    expect(screen.queryByText('PARCIAL')).not.toBeInTheDocument()
    // La tabla real vive solo en el detalle, no en el tab.
    expect(screen.queryByText('Tabla real')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar Grupo A' })).toBeInTheDocument()
  })

  it('sin cierre: muestra avance y los aciertos aparecen apenas hay resultado', async () => {
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findByText('Grupo A')
    expect(screen.getByText('12/12 completos')).toBeInTheDocument()
    expect(await screen.findAllByText('+5')).toHaveLength(8) // marcas desde la tabla real, sin gate de candado
  })

  it('grupo sin ordenar muestra estado vacío', async () => {
    seedSession('p-luis') // solo 3 grupos completos
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findByText('Grupo A')
    expect(screen.getByText('3/12 completos')).toBeInTheDocument()
    expect(screen.getAllByText('Sin ordenar')).toHaveLength(9)
  })

  it('tap en un grupo editable abre el editor de solo ese grupo', async () => {
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findByText('Grupo A')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Editar Grupo A' }))

    const dialog = await screen.findByRole('dialog', { name: 'Grupo A' })
    expect(within(dialog).getByText('Equipo A1')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /guardar grupo/i })).toBeInTheDocument()
  })
})
