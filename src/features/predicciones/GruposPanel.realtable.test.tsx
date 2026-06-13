import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../test/utils'
import { setNow } from '../../lib/clock'
import { GruposPanel } from './GruposPanel'

describe('GruposPanel — la tabla real vive en el detalle, no en el tab', () => {
  it('con candado el tab no muestra la tabla real (se ve al abrir el detalle)', async () => {
    seedSession('p-juan')
    setNow('2026-06-12T21:00:00.000Z') // torneo iniciado
    renderWithProviders(<GruposPanel locked />)
    await screen.findByText('Grupo A')
    expect(screen.queryByText('Tabla real')).not.toBeInTheDocument()
  })
  it('sin candado tampoco muestra la tabla real', async () => {
    seedSession('p-juan')
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findAllByText(/Grupo A/)
    expect(screen.queryByText('Tabla real')).not.toBeInTheDocument()
  })
})
