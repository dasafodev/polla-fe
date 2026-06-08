import { http, HttpResponse } from 'msw'
import { db } from './db'
import { resetDb } from './seed'
import { setNow, resetClock } from '../lib/clock'

// Endpoints SOLO-DEV (prefijo /__dev__). Se montan únicamente en el worker del browser cuando
// import.meta.env.DEV (ver browser.ts) y en el server de tests. Nunca forman parte del contrato
// real ni de un build de producción. Sirven para recorrer el flujo sin Google.
export const devHandlers = [
  // Lista de inscritos para el panel de dev-login.
  http.get('/api/__dev__/participants', () =>
    HttpResponse.json({ data: db.participants.map((p) => ({ id: p.id, name: p.name, role: p.role })) }, { status: 200 }),
  ),

  // Inicia sesión como un participante sembrado (setea currentSessionId sin verificar Google).
  http.post('/api/__dev__/login-as', async ({ request }) => {
    const { participantId } = (await request.json()) as { participantId: string }
    const p = db.participants.find((x) => x.id === participantId)
    if (!p) return HttpResponse.json({ error: 'Participante no encontrado', code: 'USER_NOT_FOUND' }, { status: 404 })
    db.currentSessionId = p.id
    return HttpResponse.json({ id: p.id, name: p.name, email: p.email, role: p.role }, { status: 200 })
  }),

  // Cierra la sesión de dev.
  http.post('/api/__dev__/logout', () => {
    db.currentSessionId = null
    return new HttpResponse(null, { status: 204 })
  }),

  // Simula el reloj del mock (para probar candados). iso=null vuelve al reloj real.
  http.post('/api/__dev__/set-now', async ({ request }) => {
    const { iso } = (await request.json()) as { iso: string | null }
    if (iso) {
      if (Number.isNaN(Date.parse(iso))) return HttpResponse.json({ error: 'ISO inválido', code: 'VALIDATION_ERROR' }, { status: 400 })
      setNow(iso)
    } else resetClock()
    return HttpResponse.json({ ok: true }, { status: 200 })
  }),

  // Resetea el estado del mock a la semilla.
  http.post('/api/__dev__/reset', () => {
    resetDb()
    return HttpResponse.json({ ok: true }, { status: 200 })
  }),
]
