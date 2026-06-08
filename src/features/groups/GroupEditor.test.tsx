import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { GroupEditor } from './GroupEditor'

// Regresión: en carga fría (queries vacías al montar, p.ej. deep-link/refresh con sesión persistente)
// el editor debe poblar el orden tras cargar, no quedarse vacío (antes guardaba rankings:[] → 400).
describe('GroupEditor', () => {
  it('en carga fría muestra los 4 equipos del grupo tras resolver las queries', async () => {
    db.currentSessionId = 'p-juan' // juan tiene g-A completo en el seed
    renderWithProviders(
      <Routes><Route path="/predicciones/grupos/:groupId" element={<GroupEditor />} /></Routes>,
      { route: '/predicciones/grupos/g-A' },
    )
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(4))
  })
})
