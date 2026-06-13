import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import { RankingRow, ConsensusLegend } from './parts'
import type { GroupRanking } from '../../types/api'

const baseR = (over: Partial<GroupRanking> = {}): GroupRanking => ({
  teamId: 't1', name: 'Argentina', code: 'ARG', isTop8: true, flag: '🇦🇷',
  position: 1, result: null, consensusPct: null, ...over,
})

describe('RankingRow · consenso', () => {
  it('muestra el % cuando hay consenso', () => {
    renderWithProviders(<RankingRow r={baseR({ consensusPct: 78 })} index={0} />)
    expect(screen.getByText('78%')).toBeInTheDocument()
  })

  it('redondea el porcentaje a entero', () => {
    renderWithProviders(<RankingRow r={baseR({ consensusPct: 78.6 })} index={0} />)
    expect(screen.getByText('79%')).toBeInTheDocument()
  })

  it('no muestra chip cuando consensusPct es null', () => {
    renderWithProviders(<RankingRow r={baseR({ consensusPct: null })} index={0} />)
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument()
  })

  it('exacto: muestra los puntos que suma (+N) en vez de "EXACTO" y convive con el %', () => {
    renderWithProviders(<RankingRow r={baseR({ consensusPct: 78, result: 'exact' })} index={0} exactPoints={5} />)
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.queryByText('EXACTO')).not.toBeInTheDocument()
  })

  it('exacto sin valor de puntos conocido: cae a un check', () => {
    renderWithProviders(<RankingRow r={baseR({ result: 'exact' })} index={0} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('parcial ya no se resalta (sin badge ni puntos)', () => {
    renderWithProviders(<RankingRow r={baseR({ result: 'partial' })} index={0} exactPoints={5} />)
    expect(screen.queryByText('PARCIAL')).not.toBeInTheDocument()
    expect(screen.queryByText('+5')).not.toBeInTheDocument()
  })
})

describe('ConsensusLegend', () => {
  it('grupos: explica que el % es de jugadores que coincidió contigo', () => {
    renderWithProviders(<ConsensusLegend kind="groups" />)
    expect(screen.getByText(/jugadores de la polla que coincidió contigo/i)).toBeInTheDocument()
    expect(screen.getByText(/más popular tu elección/i)).toBeInTheDocument()
  })

  it('powerups: explica que el % es de jugadores que eligió lo mismo', () => {
    renderWithProviders(<ConsensusLegend kind="powerups" />)
    expect(screen.getByText(/jugadores que eligió lo mismo que tú/i)).toBeInTheDocument()
  })
})
