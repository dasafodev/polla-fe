import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, seedSession } from '../../test/utils'
import { server } from '../../mocks/server'
import { db } from '../../mocks/db'
import { Scoreboard } from './Scoreboard'

describe('Scoreboard', () => {
  beforeEach(() => {
    seedSession('p-pedro') // pedro: #4 (fuera del podio) → fila resaltada "TÚ"
  })

  it('muestra el podio con el top 3 y resalta mi fila en la lista', async () => {
    renderWithProviders(<Scoreboard />)
    await screen.findByRole('button', { name: /Juan/i })
    expect(screen.getByRole('button', { name: /María/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Luis/i })).toBeInTheDocument()
    const pedro = screen.getByRole('button', { name: /Pedro/i })
    expect(within(pedro).getByText('TÚ')).toBeInTheDocument()
  })

  it('al tocar un jugador abre el detalle con su desglose por categoría', async () => {
    renderWithProviders(<Scoreboard />)
    await userEvent.click(await screen.findByRole('button', { name: /Juan/i }))
    const dialog = await screen.findByRole('dialog', { name: 'Juan' })
    await within(dialog).findByText('584') // total
    expect(within(dialog).getByText('480')).toBeInTheDocument() // grupos
    expect(within(dialog).getByText('14')).toBeInTheDocument() // eliminatorias
    expect(within(dialog).getByText('80')).toBeInTheDocument() // terceros
    expect(within(dialog).getByText('+15')).toBeInTheDocument() // caballo oscuro
    expect(within(dialog).getByText('-5')).toBeInTheDocument() // decepción
  })

  it('empate en el top 3 → sin podio: lista plana completa con el rank real repetido', async () => {
    // María copia las predicciones KO de Juan → empate pleno (mismo total y mismos exactos)
    const deJuan = db.koPredictions.filter((p) => p.participantId === 'p-juan')
    db.koPredictions = [
      ...db.koPredictions.filter((p) => p.participantId !== 'p-maria'),
      ...deJuan.map((p) => ({ ...p, participantId: 'p-maria' })),
    ]
    renderWithProviders(<Scoreboard />)
    expect(await screen.findByText('EMPATE EN LA PUNTA')).toBeInTheDocument()
    expect(screen.queryByText('DEMÁS JUGADORES')).not.toBeInTheDocument()
    // los 4 jugadores como filas de lista (nadie en podio)
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    const juan = screen.getByRole('button', { name: /Juan/i })
    const maria = screen.getByRole('button', { name: /María/i })
    expect(within(juan).getByText('1')).toBeInTheDocument()
    expect(within(maria).getByText('1')).toBeInTheDocument() // rank compartido
  })

  it('sin empate en el top 3, el podio sigue (caso seed: desempate por exactos KO)', async () => {
    renderWithProviders(<Scoreboard />)
    await screen.findByRole('button', { name: /Juan/i })
    expect(screen.getByText('DEMÁS JUGADORES')).toBeInTheDocument()
    expect(screen.queryByText('EMPATE EN LA PUNTA')).not.toBeInTheDocument()
  })

  it('normaliza a Título los nombres que vienen en mayúsculas o minúsculas crudas', async () => {
    const maria = db.participants.find((p) => p.id === 'p-maria')!
    maria.name = 'MARÍA LÓPEZ'
    const luis = db.participants.find((p) => p.id === 'p-luis')!
    luis.name = 'luis gómez'
    renderWithProviders(<Scoreboard />)
    await screen.findByRole('button', { name: /Juan/i })
    expect(screen.getByText('María López')).toBeInTheDocument()
    expect(screen.getByText('Luis Gómez')).toBeInTheDocument()
    expect(screen.queryByText('MARÍA LÓPEZ')).not.toBeInTheDocument()
  })

  it('el switch alterna entre provisionales (total) y oficiales (realTotal del backend)', async () => {
    // total ≠ realTotal para distinguir las dos vistas; pedro (#4, fuera del podio) queda en la lista.
    server.use(
      http.get('/api/scoreboard', () =>
        HttpResponse.json({
          updatedAt: '2026-06-06T12:00:00.000Z',
          data: [
            { rank: 1, participant: { id: 'p-juan', name: 'Juan' }, total: 145, realTotal: 40, simulatedTotal: 105, prize: 700000 },
            { rank: 2, participant: { id: 'p-maria', name: 'María' }, total: 132, realTotal: 30, simulatedTotal: 102, prize: 250000 },
            { rank: 3, participant: { id: 'p-luis', name: 'Luis' }, total: 118, realTotal: 20, simulatedTotal: 98, prize: 50000 },
            { rank: 4, participant: { id: 'p-pedro', name: 'Pedro' }, total: 98, realTotal: 10, simulatedTotal: 88, prize: null },
          ],
        }),
      ),
    )
    renderWithProviders(<Scoreboard />)
    const pedro = await screen.findByRole('button', { name: /Pedro/i })
    expect(within(pedro).getByText(/^98 pts$/)).toBeInTheDocument() // provisional = total

    await userEvent.click(screen.getByRole('button', { name: 'Oficiales' }))
    const pedroOfficial = screen.getByRole('button', { name: /Pedro/i })
    expect(within(pedroOfficial).getByText(/^10 pts$/)).toBeInTheDocument() // oficial = realTotal, no 0
    expect(screen.queryByText(/^0 pts$/)).not.toBeInTheDocument()
    // No cae al estado vacío: la Tabla sigue visible.
    expect(screen.getByRole('heading', { name: 'Tabla' })).toBeInTheDocument()
  })
})

describe('Scoreboard — lista completa', () => {
  const NAMES = ['Ana', 'Beto', 'Caro', 'Dani', 'Eva', 'Fito', 'Gabi', 'Hugo', 'Iva', 'Jose', 'Kena', 'Lalo']
  // ranks con empate al final (…,10,10,12): antes esto disparaba un separador "···" falso.
  const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 12]
  const entries = NAMES.map((name, i) => ({
    rank: RANKS[i], participant: { id: `p${i + 1}`, name }, total: 200 - i * 5, prize: null,
  }))

  let capturedUrl = ''
  beforeEach(() => {
    seedSession('p-pedro')
    capturedUrl = ''
    server.use(
      http.get('/api/scoreboard', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ updatedAt: '2026-06-06T12:00:00.000Z', data: entries })
      }),
    )
  })

  it('pide limit=all y muestra a TODOS los jugadores sin separador, aunque haya empate al final', async () => {
    renderWithProviders(<Scoreboard />)
    await screen.findByRole('button', { name: /Ana/i })

    expect(new URL(capturedUrl).searchParams.get('limit')).toBe('all')
    for (const name of NAMES) {
      expect(screen.getByRole('button', { name: new RegExp(name, 'i') })).toBeInTheDocument()
    }
    expect(screen.queryByTestId('rank-gap')).not.toBeInTheDocument()
  })
})
