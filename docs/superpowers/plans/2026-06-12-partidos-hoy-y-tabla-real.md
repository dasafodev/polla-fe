# Partidos de Hoy + Tabla Real de Grupos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aprovechar los dos endpoints nuevos del BE: (1) franja "Partidos de hoy" en el Inicio en vivo consumiendo `GET /groups/matches`, y (2) mini-tabla real por grupo (campo `standing` nuevo en `GET /groups`) junto al pronóstico en Mis Pronósticos.

**Architecture:** Mismo patrón del repo: tipos en `src/types/api.ts`, fetchers con adaptador anti-corrupción en `src/features/groups/api.ts` (el BE serializa enums en MAYÚSCULAS → `statusToFrontend`), hooks react-query con keys centralizadas en `src/lib/queryClient.ts`, mocks MSW que espejan el contrato real (status en MAYÚSCULAS, standings derivados de partidos como hace `recalculateGroupStandings` en el BE). UI con primitivas existentes (`Card`, `Flag`, `motion`).

**Tech Stack:** React + Vite + TS, TanStack Query, Framer Motion, Tailwind v4, MSW (mocks in-process), Vitest + Testing Library (jsdom).

**Contexto del BE (polla-be, ya desplegado en main):**
- `GET /groups/matches?date=YYYY-MM-DD&groupId=` → `{ data: GroupMatchDto[] }`. `date` filtra por día calendario de Colombia: rango `[dateT05:00Z, date+1T05:00Z)`. Fecha mal formada → `400 { code: 'INVALID_DATE' }`. Shape de `GroupMatchDto` (ver `polla-be/src/mappers/group-match.mapper.ts`): `{ id, matchNumber, groupId, groupLabel, scheduledAt, status, homeTeam: {id,name,code,flag}|null, awayTeam, homeTeamLabel, awayTeamLabel, scoreHome, scoreAway }` con `status` en MAYÚSCULAS (`SCHEDULED|LIVE|FINISHED`).
- `GET /groups` ahora incluye por equipo `standing: { realPosition, pts, matchesPlayed, goalsFor, goalsAgainst, goalDiff } | null` y ordena los equipos por `realPosition` (ver `polla-be/src/mappers/group.mapper.ts`). Partidos LIVE suman pts/goles pero NO `matchesPlayed`.
- El BE refresca marcadores cada 5 min (cron `sync-group-results`) → el FE puede hacer polling de ~60s.

**Comandos del repo:** `npm test` (vitest run), `npm run lint`, `npm run build`. Working dir: `/Users/santiagoforeroa/code/polla/polla-fe`.

---

## Parte A — Franja "Partidos de hoy" en el Inicio

### Task 1: Tipos `GroupMatch` + fetcher `getGroupMatches` con adaptador de status

**Files:**
- Modify: `src/types/api.ts` (después del bloque `// ── Catálogo ──`, línea ~46)
- Modify: `src/types/enums.ts` (array `ERROR_CODES`, línea ~13)
- Modify: `src/features/groups/api.ts`
- Test: `src/features/groups/api.test.ts` (agregar describe al final)

- [ ] **Step 1: Escribir el test que falla**

Leer `src/features/groups/api.test.ts` y agregar al final del archivo (e incluir `adaptGroupMatch` en el import de `./api` de la línea 2):

```ts
describe('adaptGroupMatch', () => {
  const raw = {
    id: 'gm-1', matchNumber: 1, groupId: 'g-A', groupLabel: 'A',
    scheduledAt: '2026-06-12T16:00:00.000Z', status: 'LIVE',
    homeTeam: { id: 'tA1', name: 'Equipo A1', code: 'A1', flag: null },
    awayTeam: { id: 'tA2', name: 'Equipo A2', code: 'A2', flag: null },
    homeTeamLabel: 'Equipo A1', awayTeamLabel: 'Equipo A2',
    scoreHome: 1, scoreAway: 0,
  }
  it('baja el status del backend a minúsculas (LIVE → live)', () => {
    expect(adaptGroupMatch(raw).status).toBe('live')
  })
  it('conserva marcador, grupo y equipos', () => {
    const out = adaptGroupMatch(raw)
    expect(out.scoreHome).toBe(1)
    expect(out.groupLabel).toBe('A')
    expect(out.homeTeam?.code).toBe('A1')
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/features/groups/api.test.ts`
Expected: FAIL — `adaptGroupMatch` no existe (error de import/compilación).

- [ ] **Step 3: Implementar tipos y fetcher**

En `src/types/api.ts`, justo después de la línea `export interface Group { ... }` (~46), insertar:

```ts
// ── Partidos de fase de grupos (GET /groups/matches — informativo, no paga puntos) ──
export interface GroupMatchTeam { id: string; name: string; code: string; flag: string | null }
export interface GroupMatch {
  id: string; matchNumber: number; groupId: string | null; groupLabel: string | null
  scheduledAt: string; status: MatchStatus
  homeTeam: GroupMatchTeam | null; awayTeam: GroupMatchTeam | null
  homeTeamLabel: string | null; awayTeamLabel: string | null
  scoreHome: number | null; scoreAway: number | null
}
```

(`MatchStatus` ya está importado en la línea 1 de `api.ts`.)

En `src/types/enums.ts`, dentro de `ERROR_CODES`, agregar `'INVALID_DATE',` en la sección `// predicciones / candados` (el BE lo responde para `GET /groups/matches?date=` mal formado).

En `src/features/groups/api.ts`:
- Agregar al import de tipos: `GroupMatch`.
- Agregar import: `import { statusToFrontend } from '../../lib/contract'`
- Agregar al final del archivo:

```ts
// El backend serializa status en MAYÚSCULAS (SCHEDULED|LIVE|FINISHED); adaptamos como en KO.
type RawGroupMatch = Omit<GroupMatch, 'status'> & { status: string }

export function adaptGroupMatch(m: RawGroupMatch): GroupMatch {
  return { ...m, status: statusToFrontend(m.status) }
}

export const getGroupMatches = (filters: { date?: string; groupId?: string } = {}) =>
  request<{ data: RawGroupMatch[] }>('GET', '/groups/matches', {
    query: { date: filters.date, groupId: filters.groupId },
  }).then((r) => r.data.map(adaptGroupMatch))
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/features/groups/api.test.ts`
Expected: PASS (todos los tests del archivo, incluidos los preexistentes).

- [ ] **Step 5: Commit**

```bash
git add src/types/api.ts src/types/enums.ts src/features/groups/api.ts src/features/groups/api.test.ts
git commit -m "feat(groups): tipos y fetcher para GET /groups/matches"
```

---

### Task 2: `todayBogota()` en lib/clock

**Files:**
- Modify: `src/lib/clock.ts`
- Test: `src/lib/clock.test.ts`

- [ ] **Step 1: Escribir el test que falla**

En `src/lib/clock.test.ts`, cambiar el import de la línea 2 a `import { now, setNow, resetClock, todayBogota } from './clock'` y agregar al final:

```ts
describe('todayBogota', () => {
  it('devuelve la fecha calendario de Colombia, no la UTC', () => {
    setNow('2026-06-13T02:00:00.000Z') // 9:00 p. m. del 12-jun en Bogotá
    expect(todayBogota()).toBe('2026-06-12')
  })
  it('cambia de día a las 05:00Z (medianoche Colombia)', () => {
    setNow('2026-06-13T05:00:00.000Z')
    expect(todayBogota()).toBe('2026-06-13')
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/lib/clock.test.ts`
Expected: FAIL — `todayBogota` no existe.

- [ ] **Step 3: Implementar**

Al final de `src/lib/clock.ts`:

```ts
/** Fecha calendario de "hoy" en Colombia (YYYY-MM-DD). Usa now() para respetar el reloj simulado. */
export function todayBogota(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(now()))
}
```

(`en-CA` formatea exactamente `YYYY-MM-DD`.)

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/lib/clock.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/clock.ts src/lib/clock.test.ts
git commit -m "feat(lib): todayBogota() para el día calendario de Colombia"
```

---

### Task 3: Mock MSW de `GET /api/groups/matches` + seed de partidos de grupos

**Files:**
- Modify: `src/mocks/db.ts` (interfaz `Db`, `makeEmptyDb`)
- Modify: `src/mocks/seed.ts` (`makeDb`, `makeEmptyWorldDb`)
- Modify: `src/mocks/handlers/groups.ts`
- Test: `src/mocks/handlers/groups-matches.test.ts` (nuevo)

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/mocks/handlers/groups-matches.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const login = () => post('/auth/google', { credential: makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }) })

beforeEach(async () => { await login() })

describe('GET /groups/matches', () => {
  it('sin filtros devuelve todos los partidos de grupos ordenados por fecha', async () => {
    const { data } = await (await get('/groups/matches')).json()
    expect(data).toHaveLength(6)
    expect(data[0].id).toBe('gm-a1')
    expect(data[0].status).toBe('FINISHED') // contrato real: MAYÚSCULAS
    expect(data[0].groupLabel).toBe('A')
    expect(data[0].homeTeam.code).toBe('A1')
  })
  it('?date filtra por día calendario de Colombia (incluye los de 00:30Z del día siguiente)', async () => {
    const { data } = await (await get('/groups/matches?date=2026-06-12')).json()
    expect(data.map((m: { id: string }) => m.id)).toEqual(['gm-b1', 'gm-b2', 'gm-c1'])
  })
  it('?date=2026-06-11 devuelve solo el día inaugural', async () => {
    const { data } = await (await get('/groups/matches?date=2026-06-11')).json()
    expect(data).toHaveLength(2)
  })
  it('?groupId filtra por grupo', async () => {
    const { data } = await (await get('/groups/matches?groupId=g-B')).json()
    expect(data.map((m: { id: string }) => m.id)).toEqual(['gm-b1', 'gm-b2'])
  })
  it('fecha mal formada → 400 INVALID_DATE', async () => {
    const res = await get('/groups/matches?date=12-06-2026')
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_DATE' })
  })
  it('sin sesión → 401', async () => {
    db.currentSessionId = null
    const res = await get('/groups/matches')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/mocks/handlers/groups-matches.test.ts`
Expected: FAIL — MSW `onUnhandledRequest: 'error'` rechaza `/api/groups/matches` (handler no existe).

- [ ] **Step 3: Implementar db + seed + handler**

En `src/mocks/db.ts`, junto a `DbKoMatch` agregar:

```ts
export interface DbGroupMatch {
  id: string; matchNumber: number; groupId: string; scheduledAt: string
  status: 'scheduled' | 'live' | 'finished'
  homeTeamId: string; awayTeamId: string
  scoreHome: number | null; scoreAway: number | null
}
```

En la interfaz `Db`, después de `koMatches: DbKoMatch[]`, agregar `groupMatches: DbGroupMatch[]`. En `makeEmptyDb()` agregar `groupMatches: [],`.

En `src/mocks/seed.ts`:
- Agregar `DbGroupMatch` al import de `./db`.
- Después de `buildKoMatches()` agregar:

```ts
// Partidos de fase de grupos (informativos). Resultados consistentes con officialGroupStandings
// (orden natural tX1..tX4): los grupos A y B ya tienen tabla, el resto no ha jugado.
function buildGroupMatches(): DbGroupMatch[] {
  const gm = (
    id: string, groupId: string, n: number, scheduledAt: string,
    status: DbGroupMatch['status'], homeTeamId: string, awayTeamId: string,
    scoreHome: number | null, scoreAway: number | null,
  ): DbGroupMatch => ({ id, matchNumber: n, groupId, scheduledAt, status, homeTeamId, awayTeamId, scoreHome, scoreAway })
  return [
    // 11-jun (día inaugural): grupo A jugó la fecha 1 completa
    gm('gm-a1', 'g-A', 1, '2026-06-11T16:00:00.000Z', 'finished', 'tA1', 'tA4', 3, 0),
    gm('gm-a2', 'g-A', 2, '2026-06-11T20:00:00.000Z', 'finished', 'tA2', 'tA3', 1, 0),
    // 12-jun Colombia: uno terminado, uno EN VIVO y uno programado (00:30Z del 13 = 7:30 p. m. del 12 en Bogotá)
    gm('gm-b1', 'g-B', 3, '2026-06-12T16:00:00.000Z', 'finished', 'tB1', 'tB4', 2, 1),
    gm('gm-b2', 'g-B', 4, '2026-06-12T20:00:00.000Z', 'live', 'tB2', 'tB3', 1, 1),
    gm('gm-c1', 'g-C', 5, '2026-06-13T00:30:00.000Z', 'scheduled', 'tC1', 'tC2', null, null),
    // 13-jun: para ejercitar el filtro por fecha
    gm('gm-d1', 'g-D', 6, '2026-06-13T16:00:00.000Z', 'scheduled', 'tD1', 'tD2', null, null),
  ]
}
```

- En el objeto que retorna `makeDb()`, junto a `koMatches`, agregar `groupMatches: buildGroupMatches(),`.
- En `makeEmptyWorldDb()`, junto a `koMatches: []`, agregar `groupMatches: [],`.

En `src/mocks/handlers/groups.ts`, dentro del array `groupsHandlers` (antes del handler de `/api/groups/predictions`), agregar:

```ts
http.get('/api/groups/matches', ({ request }) => {
  const s = requireSession(); if (s.response) return s.response
  const url = new URL(request.url)
  const date = url.searchParams.get('date')
  const groupId = url.searchParams.get('groupId')

  let list = db.groupMatches
  if (groupId) list = list.filter((m) => m.groupId === groupId)
  if (date) {
    // Espeja colombiaDayRange del BE: día calendario de Colombia = [dateT05:00Z, +24h)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return err('INVALID_DATE', 'date must be in YYYY-MM-DD format', 400)
    const start = Date.parse(`${date}T05:00:00.000Z`)
    if (Number.isNaN(start)) return err('INVALID_DATE', `Invalid date: ${date}`, 400)
    const end = start + 24 * 60 * 60 * 1000
    list = list.filter((m) => { const t = Date.parse(m.scheduledAt); return t >= start && t < end })
  }

  const data = list
    .slice()
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) || a.matchNumber - b.matchNumber)
    .map((m) => {
      const g = db.groups.find((x) => x.id === m.groupId)!
      const home = teamById(m.homeTeamId)!
      const away = teamById(m.awayTeamId)!
      return {
        id: m.id, matchNumber: m.matchNumber, groupId: m.groupId, groupLabel: g.label,
        scheduledAt: m.scheduledAt, status: m.status.toUpperCase(),
        homeTeam: { id: home.id, name: home.name, code: home.code, flag: home.flag },
        awayTeam: { id: away.id, name: away.name, code: away.code, flag: away.flag },
        homeTeamLabel: home.name, awayTeamLabel: away.name,
        scoreHome: m.scoreHome, scoreAway: m.scoreAway,
      }
    })
  return HttpResponse.json({ data }, { status: 200 })
}),
```

(`err`, `requireSession`, `teamById`, `db`, `http`, `HttpResponse` ya están importados/definidos en ese archivo.)

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/mocks/handlers/groups-matches.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Verificar que no rompió el resto de mocks**

Run: `npx vitest run src/mocks`
Expected: PASS completo.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/db.ts src/mocks/seed.ts src/mocks/handlers/groups.ts src/mocks/handlers/groups-matches.test.ts
git commit -m "feat(mocks): partidos de fase de grupos y GET /groups/matches"
```

---

### Task 4: Hook `useGroupMatches` + `TodayMatchesCard` en el Inicio en vivo

**Files:**
- Modify: `src/lib/queryClient.ts` (objeto `keys.groups`, línea ~20)
- Modify: `src/features/groups/hooks.ts`
- Modify: `src/features/home/format.ts`
- Create: `src/features/home/components/TodayMatches.tsx`
- Modify: `src/features/home/states/LiveHome.tsx`
- Test: `src/features/home/components/TodayMatches.test.tsx` (nuevo)

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/home/components/TodayMatches.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../../test/utils'
import { setNow } from '../../../lib/clock'
import { TodayMatchesCard } from './TodayMatches'

describe('TodayMatchesCard', () => {
  it('muestra los partidos del día Colombia con marcador, estado y hora', async () => {
    seedSession('p-juan')
    setNow('2026-06-12T21:00:00.000Z') // 4:00 p. m. del 12-jun en Bogotá
    renderWithProviders(<TodayMatchesCard />)

    expect(await screen.findByText('Partidos de hoy')).toBeInTheDocument()
    expect(screen.getByText('2-1')).toBeInTheDocument() // gm-b1 terminado
    expect(screen.getByText('FINAL')).toBeInTheDocument()
    expect(screen.getByText('1-1')).toBeInTheDocument() // gm-b2 en vivo
    expect(screen.getByText('EN VIVO')).toBeInTheDocument()
    expect(screen.getByText('C1')).toBeInTheDocument() // gm-c1 programado hoy (00:30Z del 13)
    // los partidos del 11-jun no aparecen
    expect(screen.queryByText('A1')).not.toBeInTheDocument()
  })

  it('no renderiza nada cuando hoy no hay partidos', async () => {
    seedSession('p-juan')
    setNow('2026-06-20T21:00:00.000Z')
    const { container } = renderWithProviders(<TodayMatchesCard />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/features/home/components/TodayMatches.test.tsx`
Expected: FAIL — `./TodayMatches` no existe.

- [ ] **Step 3: Implementar key, hook, formato y componente**

En `src/lib/queryClient.ts`, dentro de `keys.groups`, agregar:

```ts
matches: (date: string | null, groupId: string | null) => ['groups', 'matches', date, groupId] as const,
```

En `src/features/groups/hooks.ts`, agregar `getGroupMatches` al import de `./api` y al final:

```ts
export function useGroupMatches(filters: { date?: string; groupId?: string } = {}, opts: { pollMs?: number } = {}) {
  return useQuery({
    queryKey: keys.groups.matches(filters.date ?? null, filters.groupId ?? null),
    queryFn: () => getGroupMatches(filters),
    refetchInterval: opts.pollMs ?? false,
  })
}
```

En `src/features/home/format.ts`, al final:

```ts
// "4:00 p. m." — hora Colombia de un partido de hoy (sin día: la franja ya es "hoy").
export function formatHour(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })
}
```

Crear `src/features/home/components/TodayMatches.tsx`:

```tsx
import { motion } from 'framer-motion'
import { Card } from '../../../ui/Card'
import { Flag } from '../../../ui/Flag'
import { fadeUp } from '../../../ui/motion'
import { useGroupMatches } from '../../groups/hooks'
import { todayBogota } from '../../../lib/clock'
import { formatHour } from '../format'
import type { GroupMatch } from '../../../types/api'

// Marcadores del día (fase de grupos): informativos, no pagan puntos.
// El BE los sincroniza cada 5 min; aquí refrescamos cada 60s mientras el Inicio esté abierto.
export function TodayMatchesCard() {
  const matches = useGroupMatches({ date: todayBogota() }, { pollMs: 60_000 })
  const list = matches.data ?? []
  if (list.length === 0) return null

  return (
    <motion.div variants={fadeUp}>
      <Card className="p-4">
        <p className="mb-2.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted">Partidos de hoy</p>
        <div className="space-y-2.5">
          {list.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </div>
      </Card>
    </motion.div>
  )
}

function MatchRow({ m }: { m: GroupMatch }) {
  const live = m.status === 'live'
  const hasScore = m.scoreHome != null && m.scoreAway != null
  return (
    <div className="flex items-center gap-2">
      <span className="w-7 shrink-0 font-mono text-[10px] font-bold text-muted">{m.groupLabel ?? ''}</span>
      <div className="flex flex-1 items-center justify-end gap-1.5">
        <span className="text-sm font-bold text-ink">{m.homeTeam?.code ?? m.homeTeamLabel}</span>
        <Flag code={m.homeTeam?.code ?? '?'} flag={m.homeTeam?.flag} className="size-5" />
      </div>
      <span className={`min-w-14 text-center font-mono text-sm font-bold ${live ? 'text-danger' : 'text-ink'}`}>
        {hasScore ? `${m.scoreHome}-${m.scoreAway}` : formatHour(m.scheduledAt)}
      </span>
      <div className="flex flex-1 items-center gap-1.5">
        <Flag code={m.awayTeam?.code ?? '?'} flag={m.awayTeam?.flag} className="size-5" />
        <span className="text-sm font-bold text-ink">{m.awayTeam?.code ?? m.awayTeamLabel}</span>
      </div>
      <span className={`w-12 shrink-0 text-right font-mono text-[10px] font-bold ${live ? 'text-danger' : 'text-muted'}`}>
        {live ? 'EN VIVO' : m.status === 'finished' ? 'FINAL' : ''}
      </span>
    </div>
  )
}
```

En `src/features/home/states/LiveHome.tsx`:
- Agregar import: `import { TodayMatchesCard } from '../components/TodayMatches'`
- Insertar `<TodayMatchesCard />` entre el bloque de `PositionCard` y el de `NextMatchCard` (el componente trae su propio `motion.div variants={fadeUp}` y retorna `null` si no hay partidos, así no deja hueco en el `space-y-4`):

```tsx
      {live.position && (
        <motion.div variants={fadeUp}>
          <PositionCard info={live.position} />
        </motion.div>
      )}
      <TodayMatchesCard />
      {live.nextMatch && (
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/features/home/components/TodayMatches.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Verificar que el Inicio no se rompió**

Run: `npx vitest run src/features/home`
Expected: PASS completo.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queryClient.ts src/features/groups/hooks.ts src/features/home/format.ts src/features/home/components/TodayMatches.tsx src/features/home/components/TodayMatches.test.tsx src/features/home/states/LiveHome.tsx
git commit -m "feat(home): franja Partidos de hoy con marcadores en vivo"
```

---

## Parte B — Tabla real del grupo junto al pronóstico

### Task 5: Tipo `TeamStanding` + standings en el mock de `GET /groups`

**Files:**
- Modify: `src/types/api.ts` (interfaz `Team`, línea ~45)
- Modify: `src/mocks/handlers/groups.ts` (handler `GET /api/groups`)
- Test: `src/mocks/handlers/groups-matches.test.ts` (agregar describe)

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `src/mocks/handlers/groups-matches.test.ts`:

```ts
describe('GET /groups — standing por equipo', () => {
  it('grupo con partidos jugados trae standing con tabla real', async () => {
    const { data } = await (await get('/groups')).json()
    const groupA = data.find((g: { id: string }) => g.id === 'g-A')
    const tA1 = groupA.teams.find((t: { id: string }) => t.id === 'tA1')
    expect(tA1.standing).toEqual({
      realPosition: 1, pts: 3, matchesPlayed: 1, goalsFor: 3, goalsAgainst: 0, goalDiff: 3,
    })
  })
  it('un partido EN VIVO suma pts/goles pero no matchesPlayed (como el BE)', async () => {
    const { data } = await (await get('/groups')).json()
    const groupB = data.find((g: { id: string }) => g.id === 'g-B')
    const tB2 = groupB.teams.find((t: { id: string }) => t.id === 'tB2')
    expect(tB2.standing.pts).toBe(1) // empate 1-1 en vivo
    expect(tB2.standing.matchesPlayed).toBe(0)
  })
  it('grupo sin resultados → standing null en todos los equipos', async () => {
    const { data } = await (await get('/groups')).json()
    const groupE = data.find((g: { id: string }) => g.id === 'g-E')
    expect(groupE.teams.every((t: { standing: unknown }) => t.standing === null)).toBe(true)
  })
  it('los equipos vienen ordenados por realPosition cuando hay tabla', async () => {
    const { data } = await (await get('/groups')).json()
    const groupA = data.find((g: { id: string }) => g.id === 'g-A')
    expect(groupA.teams.map((t: { id: string }) => t.id)).toEqual(['tA1', 'tA2', 'tA3', 'tA4'])
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/mocks/handlers/groups-matches.test.ts`
Expected: FAIL — `standing` es `undefined` en la respuesta del mock.

- [ ] **Step 3: Implementar tipo y mock**

En `src/types/api.ts`, reemplazar la interfaz `Team` (línea ~45) por:

```ts
export interface TeamStanding {
  realPosition: number | null; pts: number; matchesPlayed: number
  goalsFor: number; goalsAgainst: number; goalDiff: number
}
export interface Team { id: string; name: string; code: string; isTop8: boolean; flag: string | null; standing?: TeamStanding | null }
```

En `src/mocks/handlers/groups.ts`, agregar arriba (junto a los helpers existentes):

```ts
// Espeja recalculateGroupStandings del BE: FINISHED y LIVE suman pts/goles (tabla en tiempo real),
// matchesPlayed solo cuenta FINISHED. Desempate: pts → dif. gol → goles a favor.
function computeStandings(group: DbGroup) {
  const played = db.groupMatches.filter(
    (m) => m.groupId === group.id && m.scoreHome != null && m.scoreAway != null && (m.status === 'finished' || m.status === 'live'),
  )
  if (played.length === 0) return null
  const tally = new Map(group.teamIds.map((id) => [id, { pts: 0, gf: 0, ga: 0, pj: 0 }]))
  for (const m of played) {
    const h = tally.get(m.homeTeamId), a = tally.get(m.awayTeamId)
    if (!h || !a) continue
    h.gf += m.scoreHome!; h.ga += m.scoreAway!; a.gf += m.scoreAway!; a.ga += m.scoreHome!
    if (m.scoreHome! > m.scoreAway!) h.pts += 3
    else if (m.scoreHome! < m.scoreAway!) a.pts += 3
    else { h.pts += 1; a.pts += 1 }
    if (m.status === 'finished') { h.pj += 1; a.pj += 1 }
  }
  const ranked = [...tally.entries()]
    .map(([teamId, t]) => ({ teamId, ...t, gd: t.gf - t.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  return new Map(ranked.map((r, i) => [r.teamId, {
    realPosition: i + 1, pts: r.pts, matchesPlayed: r.pj, goalsFor: r.gf, goalsAgainst: r.ga, goalDiff: r.gd,
  }]))
}
```

Y reemplazar el handler `http.get('/api/groups', ...)` por:

```ts
http.get('/api/groups', () => {
  const s = requireSession(); if (s.response) return s.response
  const data = db.groups.map((g) => {
    const standings = computeStandings(g)
    const teams = g.teamIds.map((id) => {
      const t = teamById(id)!
      return { id: t.id, name: t.name, code: t.code, isTop8: t.isTop8, flag: t.flag, standing: standings?.get(id) ?? null }
    })
    // Como el BE: con tabla, ordena por realPosition; sin tabla, conserva el orden del catálogo.
    teams.sort((a, b) => (a.standing?.realPosition ?? Number.MAX_SAFE_INTEGER) - (b.standing?.realPosition ?? Number.MAX_SAFE_INTEGER))
    return { id: g.id, label: g.label, name: g.name, teams }
  })
  return HttpResponse.json({ data }, { status: 200 })
}),
```

(El seed pone resultados consistentes con el orden natural `tX1..tX4`, así que el orden de equipos no cambia y los tests existentes de `GroupDeck`/`GroupsEditor` siguen pasando.)

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/mocks/handlers/groups-matches.test.ts src/mocks/handlers/groups.test.ts`
Expected: PASS completo.

- [ ] **Step 5: Verificar features que consumen /groups**

Run: `npx vitest run src/features/groups src/features/admin`
Expected: PASS completo.

- [ ] **Step 6: Commit**

```bash
git add src/types/api.ts src/mocks/handlers/groups.ts src/mocks/handlers/groups-matches.test.ts
git commit -m "feat(mocks): standing por equipo en GET /groups derivado de los partidos"
```

---

### Task 6: Componente `GroupRealTable` (mini-tabla real)

**Files:**
- Modify: `src/features/predicciones/parts.tsx`
- Test: `src/features/predicciones/GroupRealTable.test.tsx` (nuevo)

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/predicciones/GroupRealTable.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupRealTable } from './parts'

const rows = [
  { code: 'A1', flag: null, standing: { realPosition: 1, pts: 6, matchesPlayed: 2, goalsFor: 4, goalsAgainst: 1, goalDiff: 3 } },
  { code: 'A2', flag: null, standing: { realPosition: 2, pts: 4, matchesPlayed: 2, goalsFor: 2, goalsAgainst: 2, goalDiff: 0 } },
]

describe('GroupRealTable', () => {
  it('muestra encabezado, posición, código, PJ·DIF y puntos', () => {
    render(<GroupRealTable rows={rows} />)
    expect(screen.getByText('Tabla real')).toBeInTheDocument()
    expect(screen.getByText('PJ · DIF · PTS')).toBeInTheDocument()
    expect(screen.getByText('A1')).toBeInTheDocument()
    expect(screen.getByText('2 · +3')).toBeInTheDocument() // PJ · dif. gol con signo
    expect(screen.getByText('6')).toBeInTheDocument() // pts
  })
  it('no renderiza nada sin filas', () => {
    const { container } = render(<GroupRealTable rows={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/features/predicciones/GroupRealTable.test.tsx`
Expected: FAIL — `GroupRealTable` no existe en `./parts`.

- [ ] **Step 3: Implementar**

En `src/features/predicciones/parts.tsx`, agregar `TeamStanding` al import de tipos (`import type { GroupRanking, TeamStanding } from '../../types/api'`) y al final del archivo:

```tsx
export interface RealTableRow { code: string; flag: string | null; standing: TeamStanding }

// Mini-tabla real del grupo (datos de standing en GET /groups), debajo del pronóstico.
export function GroupRealTable({ rows }: { rows: RealTableRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="mt-2 rounded-lg bg-surface-2 px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">Tabla real</span>
        <span className="font-mono text-[10px] text-muted">PJ · DIF · PTS</span>
      </div>
      {rows.map((r) => {
        const gd = r.standing.goalDiff
        return (
          <div key={r.code} className="flex items-center gap-2 py-0.5">
            <span className="w-4 text-center font-mono text-[11px] font-bold text-ink-soft">{r.standing.realPosition ?? '–'}</span>
            <Flag code={r.code} flag={r.flag} className="size-4" />
            <span className="flex-1 text-xs font-medium text-ink">{r.code}</span>
            <span className="font-mono text-[11px] text-muted">{`${r.standing.matchesPlayed} · ${gd > 0 ? `+${gd}` : gd}`}</span>
            <span className="w-6 text-right font-mono text-[11px] font-bold text-ink">{r.standing.pts}</span>
          </div>
        )
      })}
    </div>
  )
}
```

(`Flag` ya está importado en `parts.tsx`.)

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/features/predicciones/GroupRealTable.test.tsx src/features/predicciones/parts.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/predicciones/parts.tsx src/features/predicciones/GroupRealTable.test.tsx
git commit -m "feat(pronosticos): componente GroupRealTable (mini-tabla real del grupo)"
```

---

### Task 7: Cablear la tabla real en `GruposPanel`

**Files:**
- Modify: `src/features/predicciones/GruposPanel.tsx`
- Test: `src/features/predicciones/GruposPanel.realtable.test.tsx` (nuevo)

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/predicciones/GruposPanel.realtable.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, seedSession } from '../../test/utils'
import { setNow } from '../../lib/clock'
import { GruposPanel } from './GruposPanel'

describe('GruposPanel — tabla real', () => {
  it('con candado muestra la tabla real solo en los grupos que ya jugaron (A y B)', async () => {
    seedSession('p-juan')
    setNow('2026-06-12T21:00:00.000Z') // torneo iniciado
    renderWithProviders(<GruposPanel locked />)
    expect(await screen.findAllByText('Tabla real')).toHaveLength(2)
  })
  it('sin candado no muestra tabla real aunque haya datos', async () => {
    seedSession('p-juan')
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findAllByText(/Grupo A/)
    expect(screen.queryByText('Tabla real')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run src/features/predicciones/GruposPanel.realtable.test.tsx`
Expected: FAIL — el primer test no encuentra 'Tabla real'.

- [ ] **Step 3: Implementar el cableado**

Reemplazar el contenido de `src/features/predicciones/GruposPanel.tsx` por:

```tsx
import { useState } from 'react'
import { useGroups, useMyGroupPredictions } from '../groups/hooks'
import { useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton, RankingRow, ConsensusLegend, GroupRealTable, type RealTableRow } from './parts'
import { GroupEditSheet } from './GroupEditSheet'
import type { Group, GroupPrediction } from '../../types/api'

export function GruposPanel({ locked }: { locked: boolean }) {
  const groups = useMyGroupPredictions()
  const catalog = useGroups()
  const totals = useMyTotals()
  const [openId, setOpenId] = useState<string | null>(null)
  if (groups.isLoading) return <PanelSkeleton />
  const list = groups.data?.data ?? []
  const completed = groups.data?.completedGroups ?? 0
  const value = locked && totals.data ? `${signed(totals.data.breakdown.groups)} pts` : `${completed}/12 completos`
  const hasConsensus = list.some((g) => g.rankings.some((r) => r.consensusPct != null))
  const catalogById = new Map((catalog.data?.data ?? []).map((g) => [g.id, g]))

  return (
    <div className="space-y-3">
      <PhaseSummary label="Grupos" value={value} />
      {hasConsensus && <ConsensusLegend kind="groups" />}
      {list.map((g) => (
        <GroupRow
          key={g.groupId}
          g={g}
          locked={locked}
          onOpen={setOpenId}
          realTable={locked ? realTableFor(catalogById.get(g.groupId)) : null}
        />
      ))}
      <GroupEditSheet groupId={openId} locked={locked} onClose={() => setOpenId(null)} />
    </div>
  )
}

// La tabla real sale del standing embebido en GET /groups (la actualiza el cron del BE cada 5 min).
function realTableFor(group: Group | undefined): RealTableRow[] | null {
  if (!group) return null
  const rows = group.teams
    .filter((t) => t.standing != null)
    .map((t) => ({ code: t.code, flag: t.flag, standing: t.standing! }))
    .sort((a, b) => (a.standing.realPosition ?? 99) - (b.standing.realPosition ?? 99))
  return rows.length > 0 ? rows : null
}

function GroupRow({ g, locked, onOpen, realTable }: {
  g: GroupPrediction; locked: boolean; onOpen: (groupId: string) => void; realTable: RealTableRow[] | null
}) {
  if (!g.groupComplete) {
    return (
      <button
        type="button"
        onClick={() => onOpen(g.groupId)}
        aria-label={`Ordenar ${g.name}`}
        className="flex w-full items-center justify-between rounded-card border border-dashed border-border bg-surface px-4 py-3.5 text-left active:scale-[0.99]"
      >
        <span className="font-display font-bold text-ink">{g.name}</span>
        <span className="text-sm font-medium text-muted">Sin ordenar</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(g.groupId)}
      aria-label={`Editar ${g.name}`}
      className="block w-full rounded-card border border-border bg-surface p-3 text-left shadow-card active:scale-[0.99]"
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-display text-sm font-extrabold text-ink">{g.name}</span>
        {locked && g.pointsEarned && (
          <span className="rounded-full bg-tint px-2 py-0.5 font-mono text-xs font-bold text-violet-strong">
            {signed(g.pointsEarned.total)}
          </span>
        )}
      </div>
      {g.rankings.map((r, i) => (
        <RankingRow key={r.teamId} r={r} index={i} />
      ))}
      {realTable && <GroupRealTable rows={realTable} />}
    </button>
  )
}
```

(Cambios reales sobre el original: import de `useGroups`, `GroupRealTable`/`RealTableRow` y tipo `Group`; el mapa `catalogById`; el helper `realTableFor`; la prop `realTable` en `GroupRow` y su render tras los `RankingRow`. Todo lo demás queda idéntico.)

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run src/features/predicciones`
Expected: PASS completo (los tests nuevos y los preexistentes de GruposPanel/MisPronosticos).

- [ ] **Step 5: Commit**

```bash
git add src/features/predicciones/GruposPanel.tsx src/features/predicciones/GruposPanel.realtable.test.tsx
git commit -m "feat(pronosticos): tabla real del grupo junto al pronóstico"
```

---

### Task 8: Verificación final

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: PASS completo, 0 fallos.

- [ ] **Step 2: Lint y build**

Run: `npm run lint && npm run build`
Expected: sin errores de ESLint ni de `tsc -b`.

- [ ] **Step 3: Smoke visual (opcional pero recomendado)**

Run: `npm run dev` y abrir la app con sesión mock; con el reloj real (12-jun-2026) el Inicio en vivo debe mostrar "Partidos de hoy" con los partidos sembrados del 12-jun, y Mis Pronósticos → Grupos debe mostrar "Tabla real" en los grupos A y B.

- [ ] **Step 4: Commit final si hubo ajustes**

```bash
git status   # si lint/build exigieron retoques, commitearlos:
git commit -am "chore: ajustes de lint/build para partidos de hoy y tabla real"
```

---

## Notas para el ejecutor

- **No tocar el orden de los handlers MSW existentes** más allá de lo indicado: las rutas son exactas (`/api/groups` vs `/api/groups/matches`), no hay conflicto de matching.
- El reloj de tests por defecto es `2026-06-06T12:00Z` (pre-torneo, ver `src/test/setup.ts`); los tests de estas features fijan `setNow('2026-06-12T21:00:00.000Z')` cuando necesitan el torneo en juego.
- `prefers-reduced-motion` ya está cubierto por las primitivas de `src/ui/motion.ts`; `TodayMatchesCard` usa `fadeUp` heredando el stagger del padre (`LiveHome`).
- Comentarios en español, escasos, solo donde el código no se explica (convención del repo).
- Commits sin co-autoría (preferencia del usuario).
