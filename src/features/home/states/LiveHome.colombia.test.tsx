import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../liveHome', () => ({ useLiveHome: vi.fn() }))
vi.mock('../components/PendingKoAlert', () => ({ PendingKoAlert: () => <div /> }))
vi.mock('../components/PositionCard', () => ({ PositionCard: () => <div>position-card</div> }))
vi.mock('../components/MatchCards', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MatchCards: ({ excludeId, heading }: any) => <div>{`matchcards:${excludeId ?? 'none'}:${heading ?? 'default'}`}</div>,
}))

import { useLiveHome } from '../liveHome'
import { LiveHome } from './LiveHome'
import type { ColombiaTakeover } from '../colombia/colombiaTakeover'

const mocked = vi.mocked(useLiveHome)

function withPosition() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mocked.mockReturnValue({ loading: false, position: { rank: 4 } as any, pendingKo: null })
}

describe('LiveHome — Modo Colombia', () => {
  it('sin takeover → muestra posición y MatchCards sin exclusión', () => {
    withPosition()
    render(<LiveHome takeover={null} />)
    expect(screen.getByText('position-card')).toBeInTheDocument()
    expect(screen.getByText('matchcards:none:default')).toBeInTheDocument()
  })

  it('con takeover → oculta posición y excluye el partido de Colombia', () => {
    withPosition()
    const takeover = { match: { id: 'col-match' } } as ColombiaTakeover
    render(<LiveHome takeover={takeover} />)
    expect(screen.queryByText('position-card')).not.toBeInTheDocument()
    expect(screen.getByText('matchcards:col-match:También hoy')).toBeInTheDocument()
  })
})
