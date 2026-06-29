import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
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

  it('marcador con ganador: oculta "¿Quién avanza?", autoguarda (sin botón) y la X cierra el sheet', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' })) // ko-r32-open-1
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    // 0-0 inicial (empate): el selector de quién avanza SÍ se muestra
    expect(within(dialog).getByText('¿Quién avanza?')).toBeInTheDocument()

    // marcador 1-0: hay ganador → el selector desaparece (es obvio que avanza quien tiene el marcador)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sumar gol a Equipo G1' }))
    expect(within(dialog).queryByText('¿Quién avanza?')).not.toBeInTheDocument()

    // ya no hay botón de guardar: se persiste solo
    expect(within(dialog).queryByRole('button', { name: /Guardar pronóstico|Actualizar pronóstico/ })).not.toBeInTheDocument()
    await waitFor(
      () => {
        const pred = db.koPredictions.find((p) => p.participantId === 'p-juan' && p.matchId === 'ko-r32-open-1')
        expect(pred).toMatchObject({ scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tG1', tripleActive: false })
      },
      { timeout: 2000 },
    )

    // la X cierra el sheet
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Pronóstico de eliminatoria' })).not.toBeInTheDocument())
  })

  it('autoguarda al cambiar el marcador, sin tocar el botón (debounce coalesce los taps)', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' })) // ko-r32-open-1
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    // dos taps rápidos → 2-0; el debounce los junta en UN solo guardado
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sumar gol a Equipo G1' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sumar gol a Equipo G1' }))

    // persiste solo, sin pulsar "Guardar pronóstico", y el sheet sigue abierto
    await waitFor(
      () => {
        const pred = db.koPredictions.find((p) => p.participantId === 'p-juan' && p.matchId === 'ko-r32-open-1')
        expect(pred).toMatchObject({ scoreHome: 2, scoreAway: 0, teamAdvancesId: 'tG1' })
      },
      { timeout: 2000 },
    )
    expect(screen.getByRole('dialog', { name: 'Pronóstico de eliminatoria' })).toBeInTheDocument()
  })

  it('cerrar justo tras un cambio (antes del debounce) persiste el pendiente al desmontar', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    // cambia el marcador y cierra de inmediato (sin esperar el debounce)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sumar gol a Equipo G1' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Pronóstico de eliminatoria' })).not.toBeInTheDocument())

    // el flush al desmontar persistió el 1-0 (no se perdió)
    await waitFor(
      () =>
        expect(db.koPredictions.find((p) => p.participantId === 'p-juan' && p.matchId === 'ko-r32-open-1')).toMatchObject({
          scoreHome: 1,
          scoreAway: 0,
          teamAdvancesId: 'tG1',
        }),
      { timeout: 2000 },
    )
  })

  it('empate: muestra "¿Quién avanza?" y no autoguarda hasta elegir', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo G1 vs Equipo H1' }))
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })
    // 0-0 es empate: el selector aparece y el indicador pide elegir quién avanza (no autoguarda)
    expect(within(dialog).getByText('¿Quién avanza?')).toBeInTheDocument()
    expect(within(dialog).getByText('Elige quién avanza para guardar')).toBeInTheDocument()

    // al elegir, completa el pronóstico y se autoguarda
    await userEvent.click(within(dialog).getByRole('button', { name: 'Equipo G1' }))
    await waitFor(
      () =>
        expect(db.koPredictions.find((p) => p.participantId === 'p-juan' && p.matchId === 'ko-r32-open-1')).toMatchObject({
          scoreHome: 0,
          scoreAway: 0,
          teamAdvancesId: 'tG1',
        }),
      { timeout: 2000 },
    )
  })

  it('partido finalizado: solo lectura con resultado real, sin botón de guardar', async () => {
    renderWithProviders(<EliminatoriasPanel locked />)
    await screen.findByText('Dieciseisavos')
    await userEvent.click(screen.getByRole('button', { name: 'Equipo A1 vs Equipo B1' })) // ko-r32-1 (finished)
    const dialog = await screen.findByRole('dialog', { name: 'Pronóstico de eliminatoria' })

    // Comparación TÚ | REAL: Juan pronosticó 2–1 (avanza A1) y el real fue 2–1 (gana A1) → acertó.
    expect(within(dialog).getByText('Real')).toBeInTheDocument() // encabezado de columna del resultado real
    expect(within(dialog).getAllByText(/Avanza/).length).toBeGreaterThan(0) // veredicto de avance
    expect(within(dialog).getByText(/Acertaste/)).toBeInTheDocument() // único del ReadOnly
    expect(within(dialog).getByText('puntos')).toBeInTheDocument() // banda de puntaje
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
    // elegir quién avanza completa el pronóstico → el autoguardado dispara el POST (→ 409 mockeado)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Equipo G1' }))

    expect(await within(dialog).findByText('Ya tienes un pronóstico para este partido.', undefined, { timeout: 2000 })).toBeInTheDocument()
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
    expect(within(dialog).getAllByText('Sin pronóstico').length).toBeGreaterThanOrEqual(1)
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
