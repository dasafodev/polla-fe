import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../../test/utils'
import { ScoreboardEmpty } from './ScoreboardEmpty'
import type { ScoreboardEntry } from '../../../types/api'

const entry = (id: string, name: string): ScoreboardEntry => ({
  rank: 0,
  participant: { id, name },
  total: 0,
  prize: null,
})

describe('ScoreboardEmpty', () => {
  it('todos en 0: muestra el conteo, me ancla de primero con TÚ y todos en 0 pts', () => {
    const entries = [entry('p-carlos', 'Carlos'), entry('p-zoe', 'Zoe'), entry('p-ana', 'Ana')]
    renderWithProviders(<ScoreboardEmpty entries={entries} meId="p-zoe" />)

    expect(screen.getByText('Todos en 0')).toBeInTheDocument()
    expect(screen.getByText(/3 jugadores listos/)).toBeInTheDocument()

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByText('Zoe')).toBeInTheDocument()
    expect(within(rows[0]).getByText('TÚ')).toBeInTheDocument()
    expect(screen.getAllByText('0 pts')).toHaveLength(3)
  })

  it('ordena el resto alfabéticamente después de mí', () => {
    const entries = [entry('p-carlos', 'Carlos'), entry('p-zoe', 'Zoe'), entry('p-ana', 'Ana'), entry('p-bruno', 'Bruno')]
    renderWithProviders(<ScoreboardEmpty entries={entries} meId="p-zoe" />)

    const names = screen.getAllByRole('listitem').map((li) => within(li).getByTestId('player-name').textContent)
    expect(names).toEqual(['Zoe', 'Ana', 'Bruno', 'Carlos'])
  })

  it('sin jugadores: muestra el mensaje de respaldo y ninguna fila', () => {
    renderWithProviders(<ScoreboardEmpty entries={[]} meId={null} />)

    expect(screen.getByText(/Aún no hay jugadores/)).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
