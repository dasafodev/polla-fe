import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, seedSession } from '../../test/utils'
import { server } from '../../mocks/server'
import { db } from '../../mocks/db'
import { EliminatoriasPanel } from '../predicciones/EliminatoriasPanel'

// Se ejercita a través del panel (integración realista): tocar un partido abre el sheet.
describe('KoPredictionSheet — ingreso de pronóstico KO', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('crea un pronóstico: marcador + quién avanza, y persiste', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' })) // ko-r32-open-1
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    // marcador 1-0: sube un gol al local
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sumar gol a Equipo G1' }))
    // quién avanza (requerido): el botón con nombre exacto del equipo, no los del stepper
    await userEvent.click(within(dialog).getByRole('button', { name: 'Equipo G1' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar pronóstico' }))

    await within(dialog).findByText('Pronóstico guardado')
    const pred = db.koPredictions.find((p) => p.participantId === 'p-juan' && p.matchId === 'ko-r32-open-1')
    expect(pred).toMatchObject({ scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tG1', tripleActive: false })
  })

  it('no permite guardar sin elegir quién avanza', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })
    expect(within(dialog).getByRole('button', { name: 'Guardar pronóstico' })).toBeDisabled()
  })

  it('partido finalizado: solo lectura con resultado real, sin botón de guardar', async () => {
    renderWithProviders(<EliminatoriasPanel locked />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo A1 vs Equipo B1' })) // ko-r32-1 (finished)
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    expect(within(dialog).getByText('Tu pronóstico')).toBeInTheDocument()
    expect(within(dialog).getByText('Resultado real')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Guardar pronóstico' })).not.toBeInTheDocument()
  })

  it('error de guardado: muestra copy en español por código, no el mensaje crudo en inglés del backend', async () => {
    // El backend real responde { code, message } con message en INGLÉS; el FE debe traducir por code.
    server.use(
      http.post('/api/ko/matches/:matchId/predictions', () =>
        HttpResponse.json({ code: 'PREDICTION_ALREADY_EXISTS', message: 'A prediction already exists for this match' }, { status: 409 }),
      ),
    )
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' })) // ko-r32-open-1
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Equipo G1' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar pronóstico' }))

    expect(await within(dialog).findByText('Ya tienes un pronóstico para este partido.')).toBeInTheDocument()
    expect(within(dialog).queryByText(/already exists/i)).not.toBeInTheDocument()
  })
})

describe('KoPredictionSheet — pronósticos de la polla', () => {
  beforeEach(() => {
    seedSession('p-juan')
  })

  it('partido ya arrancado: revela el marcador de los demás y marca "sin pronóstico" a quien no jugó', async () => {
    renderWithProviders(<EliminatoriasPanel locked />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo A1 vs Equipo B1' })) // ko-r32-1 (arrancado)
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    expect(await within(dialog).findByText('Pronósticos de la polla')).toBeInTheDocument()
    // María pronosticó 3–0 este cruce; el resto de participantes no lo jugaron.
    expect(within(dialog).getByText('María')).toBeInTheDocument()
    expect(within(dialog).getByText(/3–0/)).toBeInTheDocument()
    expect(within(dialog).getAllByText('sin pronóstico').length).toBeGreaterThanOrEqual(1)
  })

  it('si falla la carga en un partido ya arrancado: muestra error + reintento, no el copy de "aún no disponible"', async () => {
    server.use(
      http.get('/api/ko/matches/:matchId/predictions/friends', () =>
        HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'boom' }, { status: 400 }),
      ),
    )
    renderWithProviders(<EliminatoriasPanel locked />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo A1 vs Equipo B1' })) // ko-r32-1 (arrancado)
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    // El partido YA arrancó: un fallo de carga NO debe disfrazarse de "todavía no se revelan".
    expect(await within(dialog).findByText('No se pudieron cargar los pronósticos.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(within(dialog).queryByText('Se revelan cuando arranca el partido.')).not.toBeInTheDocument()

    // Restaurar el backend y reintentar recupera la lista.
    server.resetHandlers()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reintentar' }))
    expect(await within(dialog).findByText('María')).toBeInTheDocument()
  })
})
