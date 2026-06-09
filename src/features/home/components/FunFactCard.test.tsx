import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FunFactCard } from './FunFactCard'
import { FUN_FACTS } from '../data/funFacts'

afterEach(() => vi.restoreAllMocks())

describe('FunFactCard', () => {
  it('renderiza un dato del set (aleatorio por montaje)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<FunFactCard />)
    expect(screen.getByText('Dato mundialista')).toBeInTheDocument()
    expect(screen.getByText(FUN_FACTS[0].text)).toBeInTheDocument()
  })

  it('otro índice → otro dato', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    render(<FunFactCard />)
    expect(screen.getByText(FUN_FACTS[FUN_FACTS.length - 1].text)).toBeInTheDocument()
  })
})
