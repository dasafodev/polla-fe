import { db, setDb, type Db } from './db'

/** Construye un estado semilla determinista. Crece en planes siguientes (grupos/ko). */
export function makeDb(): Db {
  return {
    currentSessionId: null,
    tournamentStartAt: '2026-06-11T16:00:00.000Z',
    participants: [
      { id: 'p-admin', googleSub: 'sub-admin', name: 'Admin', email: 'admin@polla.com', phone: '+573000000000', role: 'admin' },
      { id: 'p-juan', googleSub: 'sub-juan', name: 'Juan', email: 'juan@gmail.com', phone: '+573001111111', role: 'participant' },
      { id: 'p-maria', googleSub: 'sub-maria', name: 'María', email: 'maria@gmail.com', phone: '+573002222222', role: 'participant' },
    ],
    invitations: [
      // disponible
      { id: 'inv-ok', code: 'OK1234', usedByParticipantId: null, usedAt: null, expiresAt: '2026-06-12T15:00:00.000Z', createdAt: '2026-06-06T15:00:00.000Z' },
      // usado
      { id: 'inv-used', code: 'USED99', usedByParticipantId: 'p-juan', usedAt: '2026-06-06T16:00:00.000Z', expiresAt: '2026-06-12T15:00:00.000Z', createdAt: '2026-06-06T15:00:00.000Z' },
      // expirado (expiresAt en el pasado respecto al reloj de dev típico)
      { id: 'inv-exp', code: 'EXP000', usedByParticipantId: null, usedAt: null, expiresAt: '2026-06-05T15:00:00.000Z', createdAt: '2026-06-04T15:00:00.000Z' },
    ],
  }
}

export function resetDb(): void {
  setDb(makeDb())
}

// Inicializa al cargar el módulo (browser). En tests se llama resetDb() en beforeEach.
setDb(makeDb())
void db
