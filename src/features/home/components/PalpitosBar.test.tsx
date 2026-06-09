import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/utils'
import { PalpitosBar } from './PalpitosBar'
import type { PalpitosInfo } from '../liveHome'

const team = (name: string, code: string) => ({ teamId: code, name, code, isTop8: false, flag: null })

describe('PalpitosBar', () => {
  it('lleno: muestra neto, nombres y puntos', () => {
    const info: PalpitosInfo = {
      revelacion: team('Colombia', 'COL'),
      decepcion: team('Brasil', 'BRA'),
      won: 13,
      lost: 3,
      net: 10,
      greenPct: 81,
      redPct: 19,
      isEmpty: false,
    }
    renderWithProviders(<PalpitosBar info={info} />)
    expect(screen.getByText('+10 neto')).toBeInTheDocument()
    expect(screen.getByText(/Colombia \+13/)).toBeInTheDocument()
    expect(screen.getByText(/Brasil −3/)).toBeInTheDocument()
  })

  it('vacío: muestra el mensaje y oculta el neto', () => {
    const info: PalpitosInfo = {
      revelacion: team('Colombia', 'COL'),
      decepcion: team('Brasil', 'BRA'),
      won: 0,
      lost: 0,
      net: 0,
      greenPct: 0,
      redPct: 0,
      isEmpty: true,
    }
    renderWithProviders(<PalpitosBar info={info} />)
    expect(screen.getByText('Aún sin puntos de pálpitos')).toBeInTheDocument()
    expect(screen.queryByText(/neto/)).not.toBeInTheDocument()
  })
})
