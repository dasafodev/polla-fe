import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../test/utils'
import { setNow } from '../../lib/clock'
import { PowerupsPanel } from './PowerupsPanel'

describe('PowerupsPanel', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('locked: subtotal y puntos de caballo y decepción', async () => {
    renderWithProviders(<PowerupsPanel locked />)
    await screen.findByText('Equipo A4') // caballo oscuro
    expect(screen.getByText('+10 pts')).toBeInTheDocument()
    expect(screen.getByText('+15')).toBeInTheDocument()
    expect(screen.getByText('Equipo A1')).toBeInTheDocument() // decepción
    expect(screen.getByText('-5')).toBeInTheDocument()
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/predicciones/powerups')
  })

  it('sin cierre: muestra conteo y oculta puntos', async () => {
    renderWithProviders(<PowerupsPanel locked={false} />)
    await screen.findByText('Equipo A4')
    expect(screen.getByText('2/2 elegidos')).toBeInTheDocument()
    expect(screen.queryByText('+15')).not.toBeInTheDocument()
  })

  it('post-lock: muestra la leyenda y el % de consenso en ambos slots', async () => {
    setNow('2026-06-12T00:00:00.000Z')
    renderWithProviders(<PowerupsPanel locked />)
    await screen.findByText('Equipo A4')
    expect(screen.getByText(/jugadores que eligió lo mismo que tú/i)).toBeInTheDocument()
    expect(screen.getAllByText(/^\d+%$/)).toHaveLength(2)
  })

  it('pre-lock: no muestra leyenda ni % de consenso (dato null)', async () => {
    renderWithProviders(<PowerupsPanel locked />)
    await screen.findByText('Equipo A4')
    expect(screen.queryByText(/jugadores que eligió lo mismo que tú/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument()
  })
})
