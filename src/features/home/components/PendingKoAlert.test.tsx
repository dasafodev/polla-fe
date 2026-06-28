import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useSearchParams } from 'react-router-dom'
import { renderWithProviders } from '../../../test/utils'
import { PendingKoAlert } from './PendingKoAlert'
import type { PendingKoInfo } from '../liveHome'

const info: PendingKoInfo = { count: 2, roundName: 'Dieciseisavos', deadline: '2026-06-30T18:00:00.000Z' }

// Sonda que delata a dónde aterrizó la navegación: ruta + tab del query string.
function TabProbe() {
  const [params] = useSearchParams()
  return <div>predicciones tab={params.get('tab') ?? '(ninguno)'}</div>
}

function renderRouted() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<PendingKoAlert info={info} />} />
      <Route path="/predicciones" element={<TabProbe />} />
      <Route path="/eliminatorias" element={<div>ruta legacy eliminatorias</div>} />
    </Routes>,
    { route: '/' },
  )
}

describe('PendingKoAlert', () => {
  it('"Pronosticar ahora" lleva al tab Eliminatorias de /predicciones (no a la ruta legacy)', async () => {
    renderRouted()
    await userEvent.click(screen.getByRole('button', { name: /Pronosticar ahora/i }))

    expect(screen.getByText('predicciones tab=eliminatorias')).toBeInTheDocument()
    expect(screen.queryByText('ruta legacy eliminatorias')).not.toBeInTheDocument()
  })
})
