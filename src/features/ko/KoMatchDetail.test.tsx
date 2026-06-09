import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders, seedSession } from '../../test/utils'
import { KoMatchDetail } from './KoMatchDetail'

// Regresión: editar una predicción existente NO debe mostrar el form en 0-0 / triple off
// (sembrarlo desde myPrediction evita que Guardar pise el marcador guardado).
describe('KoMatchDetail', () => {
  it('siembra el form con la predicción existente al editar (no 0-0)', async () => {
    seedSession('p-pedro') // pedro: 1-0 triple en ko-r32-open-1 (abierto, editable)
    renderWithProviders(
      <Routes><Route path="/eliminatorias/partido/:matchId" element={<KoMatchDetail />} /></Routes>,
      { route: '/eliminatorias/partido/ko-r32-open-1' },
    )
    const home = (await screen.findByLabelText(/Marcador G1/i)) as HTMLInputElement
    await waitFor(() => expect(home.value).toBe('1'))
    expect((screen.getByLabelText(/Marcador H1/i) as HTMLInputElement).value).toBe('0')
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true)
  })
})
