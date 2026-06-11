import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import { RankingRow } from './parts'
import type { GroupRanking } from '../../types/api'

const baseR = (over: Partial<GroupRanking> = {}): GroupRanking => ({
  teamId: 't1', name: 'Argentina', code: 'ARG', isTop8: true, flag: '🇦🇷',
  position: 1, result: null, consensusPct: null, ...over,
})

describe('RankingRow · consenso', () => {
  it('muestra "{pct}% coincidió" cuando hay consenso y aún no hay resultado', () => {
    renderWithProviders(<RankingRow r={baseR({ consensusPct: 78 })} index={0} showResult={false} />)
    expect(screen.getByText('78% coincidió')).toBeInTheDocument()
  })

  it('redondea el porcentaje a entero', () => {
    renderWithProviders(<RankingRow r={baseR({ consensusPct: 78.6 })} index={0} showResult={false} />)
    expect(screen.getByText('79% coincidió')).toBeInTheDocument()
  })

  it('no muestra chip cuando consensusPct es null', () => {
    renderWithProviders(<RankingRow r={baseR({ consensusPct: null })} index={0} showResult={false} />)
    expect(screen.queryByText(/coincidió/)).not.toBeInTheDocument()
  })

  it('con resultado: el badge manda y el % se muestra solo como número', () => {
    renderWithProviders(<RankingRow r={baseR({ consensusPct: 78, result: 'exact' })} index={0} showResult />)
    expect(screen.getByText('EXACTO')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
    expect(screen.queryByText(/coincidió/)).not.toBeInTheDocument()
  })
})
