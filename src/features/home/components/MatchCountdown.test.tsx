import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MatchCountdown } from './MatchCountdown'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('MatchCountdown', () => {
  it('muestra el tiempo restante y corre cada segundo', () => {
    vi.setSystemTime(new Date('2026-06-11T15:59:50.000Z'))
    render(<MatchCountdown targetIso="2026-06-11T16:00:00.000Z" />)

    expect(screen.getByText('El Mundial empieza en')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('09')).toBeInTheDocument()
  })

  it('target ya pasado → ¡Arrancó el Mundial!', () => {
    vi.setSystemTime(new Date('2026-06-11T17:00:00.000Z'))
    render(<MatchCountdown targetIso="2026-06-11T16:00:00.000Z" />)

    expect(screen.getByText('¡Arrancó el Mundial!')).toBeInTheDocument()
  })
})
