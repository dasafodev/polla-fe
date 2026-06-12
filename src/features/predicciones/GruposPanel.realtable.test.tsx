import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../test/utils'
import { setNow } from '../../lib/clock'
import { GruposPanel } from './GruposPanel'

describe('GruposPanel — tabla real', () => {
  it('con candado muestra la tabla real solo en los grupos que ya jugaron (A y B)', async () => {
    seedSession('p-juan')
    setNow('2026-06-12T21:00:00.000Z') // torneo iniciado
    renderWithProviders(<GruposPanel locked />)
    expect(await screen.findAllByText('Tabla real')).toHaveLength(2)
  })
  it('sin candado no muestra tabla real aunque haya datos', async () => {
    seedSession('p-juan')
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findAllByText(/Grupo A/)
    expect(screen.queryByText('Tabla real')).not.toBeInTheDocument()
  })
})
