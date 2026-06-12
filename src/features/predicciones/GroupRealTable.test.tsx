import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupRealTable } from './parts'

const rows = [
  { code: 'A1', flag: null, standing: { realPosition: 1, pts: 6, matchesPlayed: 2, goalsFor: 4, goalsAgainst: 1, goalDiff: 3 } },
  { code: 'A2', flag: null, standing: { realPosition: 2, pts: 4, matchesPlayed: 2, goalsFor: 2, goalsAgainst: 2, goalDiff: 0 } },
]

describe('GroupRealTable', () => {
  it('muestra encabezado, posición, código, PJ·DIF y puntos', () => {
    render(<GroupRealTable rows={rows} />)
    expect(screen.getByText('Tabla real')).toBeInTheDocument()
    expect(screen.getByText('PJ · DIF · PTS')).toBeInTheDocument()
    expect(screen.getByText('A1')).toBeInTheDocument()
    expect(screen.getByText('2 · +3')).toBeInTheDocument() // PJ · dif. gol con signo
    expect(screen.getByText('6')).toBeInTheDocument() // pts
  })
  it('no renderiza nada sin filas', () => {
    const { container } = render(<GroupRealTable rows={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
