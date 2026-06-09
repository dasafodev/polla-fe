# Resumen de pronósticos (Mis Pronósticos) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el Hub de `/predicciones` por una pantalla de resumen con 4 tabs por fase (Grupos · Terceros · Eliminatorias · Powerups) que muestra todos los pronósticos del usuario y, con el torneo iniciado, los puntos acumulados por fase y los aciertos.

**Architecture:** Una pantalla contenedora (`MisPronosticos`) con header (total global o % de avance) y tabs en `?tab=`; cada tab es un panel autónomo que lee su propio endpoint de fase (grupos/terceros/ko/powerups) para los ítems y el endpoint de breakdown para los subtotales. Editar = cada fila es un `<Link>` al editor que ya existe. Único cambio de backend: exponer el acierto por equipo (`result`) en los rankings de grupos.

**Tech Stack:** React 18, TypeScript, React Router v6, TanStack Query v5, Tailwind v4 (tokens en `theme.css`), MSW (mock del backend), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-08-mis-pronosticos-resumen-design.md`

---

## Estructura de archivos

**Crear:**
- `src/features/predicciones/hooks.ts` — `useMyTotals()` (breakdown del usuario actual) y `useAllKoPredictions()` (fan-out de las 6 rondas KO).
- `src/features/predicciones/format.ts` — helper `signed(n)`.
- `src/features/predicciones/parts.tsx` — UI compartida: `PhaseSummary`, `PanelSkeleton`.
- `src/features/predicciones/GruposPanel.tsx`
- `src/features/predicciones/TercerosPanel.tsx`
- `src/features/predicciones/EliminatoriasPanel.tsx`
- `src/features/predicciones/PowerupsPanel.tsx`
- `src/features/predicciones/MisPronosticos.tsx`
- Tests junto a cada uno (`*.test.tsx`).

**Modificar:**
- `src/types/api.ts` — `GroupRanking` gana `result`.
- `src/mocks/handlers/groups.ts` — `serializeRankings` calcula `result`.
- `src/mocks/handlers/groups.test.ts` — cubre `result`.
- `src/app/router.tsx` — `/predicciones` → `MisPronosticos`; quita `Hub` y `/predicciones/revisar`.
- `scripts/dev-smoke.mjs` — recorre el nuevo resumen.

**Eliminar:**
- `src/features/predicciones/Hub.tsx`
- `src/features/predicciones/Review.tsx`

**Datos de prueba (seed, ya existentes — no se tocan):** usuario `p-juan` tiene 12 grupos completos en orden natural (todos `exact`, grupos = 360), 8 terceros todos correctos (thirds = 40), KO: `ko-r32-1` +15, `ko-r32-2` +15, `ko-r16-1` +20 (ko = 50), powerups caballo `tA4` (+16, 2 rondas) y decepción `tA1` (−3, 1 ronda; total powerups 13), total global 463, avance 100%. `p-luis` tiene solo 3 grupos completos.

---

### Task 1: Contrato — `result` por `GroupRanking`

**Files:**
- Modify: `src/types/api.ts:49`
- Modify: `src/mocks/handlers/groups.ts:31-36,82,129`
- Test: `src/mocks/handlers/groups.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Agregar al final de `src/mocks/handlers/groups.test.ts`:

```ts
describe('GET /groups/predictions/me — result por ranking', () => {
  it('orden exacto → cada ranking trae result "exact"', async () => {
    const body = await (await get('/groups/predictions/me')).json()
    const groupA = body.data.find((d: { label: string }) => d.label === 'A')
    expect(groupA.rankings.map((r: { result: string }) => r.result)).toEqual(['exact', 'exact', 'exact', 'exact'])
  })

  it('dos posiciones intercambiadas → esas dos "partial", el resto "exact"', async () => {
    const g = db.groups[0] // g-A, teamIds [tA1,tA2,tA3,tA4]; standing oficial = orden natural
    const swapped = [g.teamIds[1], g.teamIds[0], g.teamIds[2], g.teamIds[3]] // tA2,tA1,tA3,tA4
    await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: rankingsFor(swapped) }] })
    const body = await (await get('/groups/predictions/me')).json()
    const groupA = body.data.find((d: { label: string }) => d.label === 'A')
    const byTeam = Object.fromEntries(groupA.rankings.map((r: { teamId: string; result: string }) => [r.teamId, r.result]))
    expect(byTeam[g.teamIds[0]]).toBe('partial') // tA1 quedó en pos 2
    expect(byTeam[g.teamIds[1]]).toBe('partial') // tA2 quedó en pos 1
    expect(byTeam[g.teamIds[2]]).toBe('exact')
    expect(byTeam[g.teamIds[3]]).toBe('exact')
  })

  it('sin standings oficiales → result null', async () => {
    db.officialGroupStandings = null
    const body = await (await get('/groups/predictions/me')).json()
    expect(body.data[0].rankings[0].result).toBeNull()
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/mocks/handlers/groups.test.ts`
Expected: FAIL — `result` es `undefined` (no `'exact'`/`'partial'`/`null`).

- [ ] **Step 3: Agregar el campo al tipo**

En `src/types/api.ts`, reemplazar la línea de `GroupRanking`:

```ts
export interface GroupRanking { teamId: string; name: string; code: string; isTop8: boolean; position: number; result: 'exact' | 'partial' | null }
```

- [ ] **Step 4: Calcular `result` en el handler**

En `src/mocks/handlers/groups.ts`, reemplazar `serializeRankings` (líneas 31-36) por:

```ts
function serializeRankings(pred?: DbGroupPrediction, official?: string[]) {
  return (pred?.rankings ?? []).slice().sort((a, b) => a.position - b.position).map((r) => {
    const t = teamById(r.teamId)!
    const result: 'exact' | 'partial' | null = !official
      ? null
      : official.indexOf(t.id) === r.position - 1
        ? 'exact'
        : official.includes(t.id)
          ? 'partial'
          : null
    return { teamId: t.id, name: t.name, code: t.code, isTop8: t.isTop8, position: r.position, result }
  })
}
```

En el handler `GET /api/groups/predictions/me` (línea ~82), pasar el standing oficial:

```ts
        rankings: serializeRankings(pred, db.officialGroupStandings?.[g.id]), pointsEarned: complete ? groupPointsFor(db, pid, g.id) : null,
```

El handler de `friends` (línea ~129) se deja igual (`serializeRankings(pred)` → `result: null`, no filtra correctitud de terceros).

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run src/mocks/handlers/groups.test.ts`
Expected: PASS (todos, incluidos los previos).

- [ ] **Step 6: Commit**

```bash
git add src/types/api.ts src/mocks/handlers/groups.ts src/mocks/handlers/groups.test.ts
git commit -m "feat(grupos): expone result (exact/partial) por ranking en /me"
```

---

### Task 2: Fundaciones — `hooks.ts`, `format.ts`, `parts.tsx`

**Files:**
- Create: `src/features/predicciones/format.ts`
- Create: `src/features/predicciones/parts.tsx`
- Create: `src/features/predicciones/hooks.ts`
- Test: `src/features/predicciones/format.test.ts`
- Test: `src/features/predicciones/hooks.test.tsx`

- [ ] **Step 1: Test de `signed`**

Crear `src/features/predicciones/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { signed } from './format'

describe('signed', () => {
  it('prefija + a positivos y 0', () => {
    expect(signed(360)).toBe('+360')
    expect(signed(0)).toBe('+0')
  })
  it('deja el negativo tal cual', () => {
    expect(signed(-3)).toBe('-3')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/features/predicciones/format.test.ts`
Expected: FAIL — no existe `./format`.

- [ ] **Step 3: Implementar `format.ts`**

Crear `src/features/predicciones/format.ts`:

```ts
export const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)
```

- [ ] **Step 4: Implementar `parts.tsx`**

Crear `src/features/predicciones/parts.tsx`:

```tsx
export function PhaseSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-1">
      <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
      <span className="font-mono text-sm font-bold text-ink">{value}</span>
    </div>
  )
}

export function PanelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-card bg-surface-2" aria-busy />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Implementar `hooks.ts` (solo `useMyTotals` por ahora)**

Crear `src/features/predicciones/hooks.ts`:

```ts
import { useAuth } from '../../auth/useAuth'
import { useBreakdown } from '../scoreboard/hooks'

export function useMyTotals() {
  const { participant } = useAuth()
  return useBreakdown(participant?.id ?? '')
}
```

- [ ] **Step 6: Test de `useMyTotals`**

Crear `src/features/predicciones/hooks.test.tsx`:

```tsx
import { type ReactNode } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { makeQueryClient } from '../../lib/queryClient'
import { AuthProvider } from '../../auth/AuthContext'
import { db } from '../../mocks/db'
import { useMyTotals } from './hooks'

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('useMyTotals', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-juan'
  })
  it('devuelve el desglose del participante actual', async () => {
    const { result } = renderHook(() => useMyTotals(), { wrapper })
    await waitFor(() => expect(result.current.data?.total).toBe(463))
    expect(result.current.data?.breakdown.groups).toBe(360)
  })
})
```

- [ ] **Step 7: Correr y verificar que pasa**

Run: `npx vitest run src/features/predicciones/format.test.ts src/features/predicciones/hooks.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/predicciones/format.ts src/features/predicciones/format.test.ts src/features/predicciones/parts.tsx src/features/predicciones/hooks.ts src/features/predicciones/hooks.test.tsx
git commit -m "feat(predicciones): fundaciones del resumen (useMyTotals, signed, parts)"
```

---

### Task 3: `GruposPanel`

**Files:**
- Create: `src/features/predicciones/GruposPanel.tsx`
- Test: `src/features/predicciones/GruposPanel.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/predicciones/GruposPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { GruposPanel } from './GruposPanel'

describe('GruposPanel', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-juan'
  })

  it('locked: subtotal de puntos, 12 grupos en mi orden y marcas EXACTO', async () => {
    renderWithProviders(<GruposPanel locked />)
    await screen.findByText('Grupo A')
    expect(screen.getAllByText(/^Grupo [A-L]$/)).toHaveLength(12)
    expect(screen.getByText('+360 pts')).toBeInTheDocument()
    expect(screen.getByText('Equipo A1')).toBeInTheDocument()
    expect(screen.getAllByText('EXACTO')).toHaveLength(48) // 12 grupos × 4
    expect(screen.getByRole('link', { name: 'Editar Grupo A' })).toHaveAttribute('href', '/predicciones/grupos')
  })

  it('sin cierre: muestra avance y oculta marcas', async () => {
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findByText('Grupo A')
    expect(screen.getByText('12/12 completos')).toBeInTheDocument()
    expect(screen.queryByText('EXACTO')).not.toBeInTheDocument()
  })

  it('grupo sin ordenar muestra estado vacío', async () => {
    db.currentSessionId = 'p-luis' // solo 3 grupos completos
    renderWithProviders(<GruposPanel locked={false} />)
    await screen.findByText('Grupo A')
    expect(screen.getByText('3/12 completos')).toBeInTheDocument()
    expect(screen.getAllByText('Sin ordenar')).toHaveLength(9)
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/features/predicciones/GruposPanel.test.tsx`
Expected: FAIL — no existe `./GruposPanel`.

- [ ] **Step 3: Implementar `GruposPanel.tsx`**

Crear `src/features/predicciones/GruposPanel.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useMyGroupPredictions } from '../groups/hooks'
import { useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import { Flag } from '../../ui/Flag'
import type { GroupPrediction, GroupRanking } from '../../types/api'

export function GruposPanel({ locked }: { locked: boolean }) {
  const groups = useMyGroupPredictions()
  const totals = useMyTotals()
  if (groups.isLoading) return <PanelSkeleton />
  const list = groups.data?.data ?? []
  const completed = groups.data?.completedGroups ?? 0
  const value = locked && totals.data ? `${signed(totals.data.breakdown.groups)} pts` : `${completed}/12 completos`

  return (
    <div className="space-y-3">
      <PhaseSummary label="Grupos" value={value} />
      {list.map((g) => (
        <GroupRow key={g.groupId} g={g} locked={locked} />
      ))}
    </div>
  )
}

function GroupRow({ g, locked }: { g: GroupPrediction; locked: boolean }) {
  if (!g.groupComplete) {
    return (
      <Link
        to="/predicciones/grupos"
        aria-label={`Ordenar ${g.name}`}
        className="flex items-center justify-between rounded-card border border-dashed border-border bg-surface px-4 py-3.5"
      >
        <span className="font-display font-bold text-ink">{g.name}</span>
        <span className="text-sm font-medium text-muted">Sin ordenar</span>
      </Link>
    )
  }
  return (
    <Link
      to="/predicciones/grupos"
      aria-label={`Editar ${g.name}`}
      className="block rounded-card border border-border bg-surface p-3 shadow-card active:scale-[0.99]"
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
        <RankingRow key={r.teamId} r={r} index={i} showResult={locked} />
      ))}
    </Link>
  )
}

function RankingRow({ r, index, showResult }: { r: GroupRanking; index: number; showResult: boolean }) {
  const top = index < 2
  const result = showResult ? r.result : null
  const tint = result === 'exact' ? 'bg-[#eaf6f0]' : result === 'partial' ? 'bg-[#fdf4e7]' : ''
  const posClass =
    result === 'exact'
      ? 'bg-success text-white'
      : result === 'partial'
        ? 'bg-[#e8a33d] text-white'
        : top
          ? 'bg-tint text-violet-strong'
          : 'bg-surface-2 text-ink-soft'
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 ${tint}`}>
      <span className={`grid size-5 place-items-center rounded-full font-mono text-[11px] font-bold ${posClass}`}>{r.position}</span>
      <Flag code={r.code} className="size-4" />
      <span className="flex-1 text-sm font-medium text-ink">{r.name}</span>
      {result === 'exact' && (
        <span className="rounded-full bg-[#d8efe3] px-2 py-0.5 font-mono text-[10px] font-bold text-success">EXACTO</span>
      )}
      {result === 'partial' && (
        <span className="rounded-full bg-[#f7e7cb] px-2 py-0.5 font-mono text-[10px] font-bold text-[#9a6a16]">PARCIAL</span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/features/predicciones/GruposPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/predicciones/GruposPanel.tsx src/features/predicciones/GruposPanel.test.tsx
git commit -m "feat(predicciones): GruposPanel del resumen"
```

---

### Task 4: `TercerosPanel`

**Files:**
- Create: `src/features/predicciones/TercerosPanel.tsx`
- Test: `src/features/predicciones/TercerosPanel.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/predicciones/TercerosPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { TercerosPanel } from './TercerosPanel'

describe('TercerosPanel', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-juan'
  })

  it('locked: subtotal, 8 elegidos y marca Clasificó', async () => {
    renderWithProviders(<TercerosPanel locked />)
    await screen.findByText('Equipo A3')
    expect(screen.getByText('+40 pts')).toBeInTheDocument()
    expect(screen.getAllByText('Clasificó')).toHaveLength(8)
    expect(screen.getByRole('link', { name: 'Editar terceros' })).toHaveAttribute('href', '/predicciones/terceros')
  })

  it('sin cierre: muestra conteo y oculta marcas', async () => {
    renderWithProviders(<TercerosPanel locked={false} />)
    await screen.findByText('Equipo A3')
    expect(screen.getByText('8/8 elegidos')).toBeInTheDocument()
    expect(screen.queryByText('Clasificó')).not.toBeInTheDocument()
  })

  it('un elegido que no fue tercero oficial muestra "No clasificó"', async () => {
    db.officialBestThirds = ['tA3', 'tB3', 'tC3', 'tD3', 'tE3', 'tF3', 'tG3', 'tZZ'] // excluye tH3
    renderWithProviders(<TercerosPanel locked />)
    await screen.findByText('Equipo A3')
    expect(screen.getAllByText('Clasificó')).toHaveLength(7)
    expect(screen.getByText('No clasificó')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/features/predicciones/TercerosPanel.test.tsx`
Expected: FAIL — no existe `./TercerosPanel`.

- [ ] **Step 3: Implementar `TercerosPanel.tsx`**

Crear `src/features/predicciones/TercerosPanel.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useThirds } from '../groups/hooks'
import { useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import { Flag } from '../../ui/Flag'
import type { ThirdCandidate } from '../../types/api'

export function TercerosPanel({ locked }: { locked: boolean }) {
  const thirds = useThirds()
  const totals = useMyTotals()
  if (thirds.isLoading) return <PanelSkeleton />
  const selected = (thirds.data?.data ?? []).filter((c) => c.selected)
  const count = thirds.data?.selectedCount ?? 0
  const value = locked && totals.data ? `${signed(totals.data.breakdown.thirds)} pts` : `${count}/8 elegidos`

  return (
    <div className="space-y-3">
      <PhaseSummary label="Terceros" value={value} />
      {selected.length === 0 ? (
        <Link
          to="/predicciones/terceros"
          aria-label="Editar terceros"
          className="block rounded-card border border-dashed border-border bg-surface px-4 py-6 text-center text-muted"
        >
          Aún no has elegido tus 8 terceros
        </Link>
      ) : (
        <div className="space-y-2">
          {selected.map((c) => (
            <ThirdRow key={c.teamId} c={c} showResult={locked} />
          ))}
        </div>
      )}
    </div>
  )
}

function ThirdRow({ c, showResult }: { c: ThirdCandidate; showResult: boolean }) {
  const scored = showResult && c.pointsEarned != null
  const correct = scored && c.pointsEarned!.pts_third_correct > 0
  const tint = scored ? (correct ? 'bg-[#eaf6f0]' : 'bg-[#fdf4e7]') : 'bg-surface'
  return (
    <Link
      to="/predicciones/terceros"
      aria-label="Editar terceros"
      className={`flex items-center gap-3 rounded-card border border-border px-3 py-2.5 ${tint}`}
    >
      <Flag code={c.code} className="size-6" />
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">{c.name}</span>
        <span className="block text-xs text-ink-soft">Grupo {c.label}</span>
      </span>
      {scored &&
        (correct ? (
          <span className="rounded-full bg-[#d8efe3] px-2 py-0.5 font-mono text-[10px] font-bold text-success">Clasificó</span>
        ) : (
          <span className="rounded-full bg-[#f7e7cb] px-2 py-0.5 font-mono text-[10px] font-bold text-[#9a6a16]">No clasificó</span>
        ))}
    </Link>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/features/predicciones/TercerosPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/predicciones/TercerosPanel.tsx src/features/predicciones/TercerosPanel.test.tsx
git commit -m "feat(predicciones): TercerosPanel del resumen"
```

---

### Task 5: `EliminatoriasPanel` (+ `useAllKoPredictions`)

**Files:**
- Modify: `src/features/predicciones/hooks.ts`
- Create: `src/features/predicciones/EliminatoriasPanel.tsx`
- Test: `src/features/predicciones/EliminatoriasPanel.test.tsx`

- [ ] **Step 1: Agregar `useAllKoPredictions` a `hooks.ts`**

En `src/features/predicciones/hooks.ts`, añadir imports y el hook (deja `useMyTotals` como está):

```ts
import { useQueries } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { getKoMatches } from '../ko/api'
import { ROUND_SLUGS } from '../../types/enums'
import type { KoMatchesResponse } from '../../types/api'

export function useAllKoPredictions(): { isLoading: boolean; rounds: KoMatchesResponse[] } {
  const results = useQueries({
    queries: ROUND_SLUGS.map((slug) => ({ queryKey: keys.ko.round(slug), queryFn: () => getKoMatches(slug) })),
  })
  return {
    isLoading: results.some((r) => r.isLoading),
    rounds: results.map((r) => r.data).filter((d): d is KoMatchesResponse => !!d),
  }
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/features/predicciones/EliminatoriasPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { EliminatoriasPanel } from './EliminatoriasPanel'

describe('EliminatoriasPanel', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-juan'
  })

  it('locked: secciones por ronda, puntos por partido y partidos sin pronóstico', async () => {
    renderWithProviders(<EliminatoriasPanel locked />)
    await screen.findByText('Dieciseisavos') // r32
    expect(screen.getByText('Octavos')).toBeInTheDocument() // r16
    expect(screen.getByText('+50 pts')).toBeInTheDocument() // subtotal de fase
    expect(screen.getAllByText('+15')).toHaveLength(2) // r32-1 y r32-2 (exactos)
    expect(screen.getAllByText('Sin pronóstico')).toHaveLength(6) // 8 r32 − 2 pronosticados
    expect(screen.getByRole('link', { name: 'Equipo A1 vs Equipo B1' })).toHaveAttribute(
      'href',
      '/eliminatorias/partido/ko-r32-1',
    )
  })

  it('sin cierre: conteo de pronósticos y sin puntos/resultados', async () => {
    renderWithProviders(<EliminatoriasPanel locked={false} />)
    await screen.findByText('Dieciseisavos')
    expect(screen.getByText('3 pronósticos')).toBeInTheDocument()
    expect(screen.queryByText('+50 pts')).not.toBeInTheDocument()
    expect(screen.queryByText('+15')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Correr y verificar que falla**

Run: `npx vitest run src/features/predicciones/EliminatoriasPanel.test.tsx`
Expected: FAIL — no existe `./EliminatoriasPanel`.

- [ ] **Step 4: Implementar `EliminatoriasPanel.tsx`**

Crear `src/features/predicciones/EliminatoriasPanel.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useAllKoPredictions, useMyTotals } from './hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import type { KoMatch, KoMatchesResponse } from '../../types/api'

export function EliminatoriasPanel({ locked }: { locked: boolean }) {
  const { isLoading, rounds } = useAllKoPredictions()
  const totals = useMyTotals()
  if (isLoading) return <PanelSkeleton />
  const withMatches = rounds.filter((r) => r.matches.length > 0)
  const predictedCount = withMatches.reduce((n, r) => n + r.matches.filter((m) => m.myPrediction).length, 0)
  const value = locked && totals.data ? `${signed(totals.data.breakdown.ko)} pts` : `${predictedCount} pronósticos`

  return (
    <div className="space-y-4">
      <PhaseSummary label="Eliminatorias" value={value} />
      {withMatches.map((r) => (
        <RoundSection key={r.round.slug} r={r} locked={locked} />
      ))}
    </div>
  )
}

function RoundSection({ r, locked }: { r: KoMatchesResponse; locked: boolean }) {
  const roundPts = r.matches.reduce((n, m) => n + (m.myPrediction?.pointsEarned?.total ?? 0), 0)
  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-1.5">
        <span className="font-mono text-[11px] font-bold uppercase tracking-wide text-muted">{r.round.name}</span>
        {locked && <span className="font-mono text-xs font-bold text-violet">{signed(roundPts)}</span>}
      </div>
      <div className="space-y-2">
        {r.matches.map((m) => (
          <MatchRow key={m.id} m={m} locked={locked} />
        ))}
      </div>
    </div>
  )
}

function teamName(m: KoMatch, side: 'home' | 'away'): string {
  if (side === 'home') return m.homeTeam?.name ?? m.homeTeamLabel ?? '—'
  return m.awayTeam?.name ?? m.awayTeamLabel ?? '—'
}

function advancesName(m: KoMatch): string {
  const id = m.myPrediction?.teamAdvancesId
  if (!id) return ''
  if (m.homeTeam?.id === id) return m.homeTeam.name
  if (m.awayTeam?.id === id) return m.awayTeam.name
  return ''
}

function MatchRow({ m, locked }: { m: KoMatch; locked: boolean }) {
  const home = teamName(m, 'home')
  const away = teamName(m, 'away')
  const pred = m.myPrediction
  const pe = pred?.pointsEarned
  const scored = locked && m.result != null && pe != null
  const advancesHit = scored && pe!.pts_ko_advances > 0
  const exactHit = scored && pe!.pts_ko_exact_score > 0
  return (
    <Link
      to={`/eliminatorias/partido/${m.id}`}
      aria-label={`${home} vs ${away}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface px-3 py-2.5 shadow-card active:scale-[0.99]"
    >
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">
          {home} {pred ? `${pred.scoreHome} – ${pred.scoreAway}` : ''} {away}
        </span>
        <span className="block text-xs text-ink-soft">
          {pred ? (
            <>
              Avanza {advancesName(m)}
              {advancesHit ? ' ✓' : ''}
              {scored && m.result ? ` · real ${m.result.scoreHome}–${m.result.scoreAway}${exactHit ? ' ✓' : ''}` : ''}
            </>
          ) : (
            'Sin pronóstico'
          )}
        </span>
      </span>
      {pred?.tripleActive && (
        <span className="rounded bg-tint px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet">×3</span>
      )}
      {scored && <span className={`font-mono text-sm font-bold ${pe!.total > 0 ? 'text-success' : 'text-muted'}`}>{signed(pe!.total)}</span>}
    </Link>
  )
}
```

- [ ] **Step 5: Correr y verificar que pasa**

Run: `npx vitest run src/features/predicciones/EliminatoriasPanel.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/predicciones/hooks.ts src/features/predicciones/EliminatoriasPanel.tsx src/features/predicciones/EliminatoriasPanel.test.tsx
git commit -m "feat(predicciones): EliminatoriasPanel con secciones por ronda"
```

---

### Task 6: `PowerupsPanel`

**Files:**
- Create: `src/features/predicciones/PowerupsPanel.tsx`
- Test: `src/features/predicciones/PowerupsPanel.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/predicciones/PowerupsPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { PowerupsPanel } from './PowerupsPanel'

describe('PowerupsPanel', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-juan'
  })

  it('locked: subtotal y puntos de caballo y decepción', async () => {
    renderWithProviders(<PowerupsPanel locked />)
    await screen.findByText('Equipo A4') // caballo oscuro
    expect(screen.getByText('+13 pts')).toBeInTheDocument()
    expect(screen.getByText('+16')).toBeInTheDocument()
    expect(screen.getByText('Equipo A1')).toBeInTheDocument() // decepción
    expect(screen.getByText('-3')).toBeInTheDocument()
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/predicciones/powerups')
  })

  it('sin cierre: muestra conteo y oculta puntos', async () => {
    renderWithProviders(<PowerupsPanel locked={false} />)
    await screen.findByText('Equipo A4')
    expect(screen.getByText('2/2 elegidos')).toBeInTheDocument()
    expect(screen.queryByText('+16')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/features/predicciones/PowerupsPanel.test.tsx`
Expected: FAIL — no existe `./PowerupsPanel`.

- [ ] **Step 3: Implementar `PowerupsPanel.tsx`**

Crear `src/features/predicciones/PowerupsPanel.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Horse, TrendDown } from '@phosphor-icons/react'
import { usePowerups } from '../powerups/hooks'
import { signed } from './format'
import { PhaseSummary, PanelSkeleton } from './parts'
import type { PowerupTeam } from '../../types/api'

export function PowerupsPanel({ locked }: { locked: boolean }) {
  const pw = usePowerups()
  if (pw.isLoading) return <PanelSkeleton />
  const data = pw.data
  const pe = data?.pointsEarned ?? null
  const chosen = (data?.darkHorse ? 1 : 0) + (data?.disappointment ? 1 : 0)
  const value = locked && pe ? `${signed(pe.total)} pts` : `${chosen}/2 elegidos`

  return (
    <div className="space-y-3">
      <PhaseSummary label="Powerups" value={value} />
      <PowerupCard
        kind="dark"
        label="Caballo oscuro"
        team={data?.darkHorse ?? null}
        rounds={locked && pe ? pe.dark_horse_rounds_advanced : null}
        points={locked && pe ? pe.pts_dark_horse_per_round : null}
      />
      <PowerupCard
        kind="down"
        label="La decepción"
        team={data?.disappointment ?? null}
        rounds={locked && pe ? pe.disappointment_rounds_advanced : null}
        points={locked && pe ? pe.pts_disappointment_per_round : null}
      />
    </div>
  )
}

function PowerupCard({
  kind,
  label,
  team,
  rounds,
  points,
}: {
  kind: 'dark' | 'down'
  label: string
  team: PowerupTeam | null
  rounds: number | null
  points: number | null
}) {
  return (
    <Link
      to="/predicciones/powerups"
      aria-label={`Editar ${label}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-3 shadow-card active:scale-[0.99]"
    >
      <span className={`grid size-9 place-items-center rounded-[10px] ${kind === 'dark' ? 'bg-tint text-violet' : 'bg-[#fdeede] text-lock'}`}>
        {kind === 'dark' ? <Horse size={18} weight="bold" /> : <TrendDown size={18} weight="bold" />}
      </span>
      <span className="flex-1">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wide text-muted">{label}</span>
        <span className="block text-sm font-bold text-ink">{team?.name ?? '—'}</span>
        {rounds != null && <span className="block text-xs text-ink-soft">Avanzó {rounds} rondas</span>}
      </span>
      {points != null && (
        <span className={`font-mono text-sm font-bold ${kind === 'dark' ? 'text-success' : 'text-lock'}`}>{signed(points)}</span>
      )}
    </Link>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/features/predicciones/PowerupsPanel.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/predicciones/PowerupsPanel.tsx src/features/predicciones/PowerupsPanel.test.tsx
git commit -m "feat(predicciones): PowerupsPanel del resumen"
```

---

### Task 7: `MisPronosticos` (pantalla + tabs)

**Files:**
- Create: `src/features/predicciones/MisPronosticos.tsx`
- Test: `src/features/predicciones/MisPronosticos.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/features/predicciones/MisPronosticos.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { setNow } from '../../lib/clock'
import { MisPronosticos } from './MisPronosticos'

describe('MisPronosticos', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-juan'
  })

  it('torneo no iniciado: header con % de avance y tab Grupos por defecto', async () => {
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('Grupo A')
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Terceros' })).toBeInTheDocument()
  })

  it('cambia a la tab Terceros al tocarla', async () => {
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('Grupo A')
    await userEvent.click(screen.getByRole('button', { name: 'Terceros' }))
    await screen.findByText('Equipo A3')
    expect(screen.queryByText('Grupo A')).not.toBeInTheDocument()
  })

  it('torneo iniciado: header muestra el total de puntos', async () => {
    setNow(db.tournamentStartAt)
    renderWithProviders(<MisPronosticos />, { route: '/predicciones' })
    await screen.findByText('463 pts')
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/features/predicciones/MisPronosticos.test.tsx`
Expected: FAIL — no existe `./MisPronosticos`.

- [ ] **Step 3: Implementar `MisPronosticos.tsx`**

Crear `src/features/predicciones/MisPronosticos.tsx`:

```tsx
import { useSearchParams } from 'react-router-dom'
import { useOnboardingState } from '../onboarding/onboardingState'
import { useMyTotals } from './hooks'
import { GruposPanel } from './GruposPanel'
import { TercerosPanel } from './TercerosPanel'
import { EliminatoriasPanel } from './EliminatoriasPanel'
import { PowerupsPanel } from './PowerupsPanel'

const TABS = [
  { key: 'grupos', label: 'Grupos' },
  { key: 'terceros', label: 'Terceros' },
  { key: 'eliminatorias', label: 'Eliminatorias' },
  { key: 'powerups', label: 'Powerups' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function MisPronosticos() {
  const state = useOnboardingState()
  const totals = useMyTotals()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'grupos') as TabKey

  if (state.loading) return <ScreenSkeleton />

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between pt-2">
        <h1 className="font-display text-2xl font-extrabold text-ink">Predicciones</h1>
        <span className="font-mono text-sm font-bold text-violet">
          {state.locked && totals.data ? `${totals.data.total} pts` : `${state.percent}%`}
        </span>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key })}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-bold ${
              tab === t.key ? 'bg-violet text-white' : 'border border-border bg-surface text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'grupos' && <GruposPanel locked={state.locked} />}
      {tab === 'terceros' && <TercerosPanel locked={state.locked} />}
      {tab === 'eliminatorias' && <EliminatoriasPanel locked={state.locked} />}
      {tab === 'powerups' && <PowerupsPanel locked={state.locked} />}
    </div>
  )
}

function ScreenSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="h-8 w-44 animate-pulse rounded bg-surface-2" aria-busy />
      <div className="h-9 animate-pulse rounded-full bg-surface-2" />
      <div className="h-64 animate-pulse rounded-card bg-surface-2" />
    </div>
  )
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx vitest run src/features/predicciones/MisPronosticos.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/predicciones/MisPronosticos.tsx src/features/predicciones/MisPronosticos.test.tsx
git commit -m "feat(predicciones): pantalla MisPronosticos con tabs por fase"
```

---

### Task 8: Montar en el router y eliminar Hub/Review

**Files:**
- Modify: `src/app/router.tsx:8-9,45,49`
- Delete: `src/features/predicciones/Hub.tsx`
- Delete: `src/features/predicciones/Review.tsx`

- [ ] **Step 1: Reemplazar imports y rutas en `router.tsx`**

En `src/app/router.tsx`, borrar las dos líneas de import de `Hub` y `Review` (líneas 8-9) y agregar:

```tsx
import { MisPronosticos } from '../features/predicciones/MisPronosticos'
```

Reemplazar la ruta de `predicciones` (línea 45):

```tsx
      { path: 'predicciones', element: <MisPronosticos /> },
```

Borrar por completo la línea de la ruta `revisar` (línea 49):

```tsx
      { path: 'predicciones/revisar', element: <Review /> },
```

- [ ] **Step 2: Eliminar los archivos obsoletos**

```bash
git rm src/features/predicciones/Hub.tsx src/features/predicciones/Review.tsx
```

- [ ] **Step 3: Verificar tipos (no quedan refs colgadas)**

Run: `npx tsc -b`
Expected: sin errores. (Confirma que nada importa `Hub`/`Review` ni `/predicciones/revisar`.)

- [ ] **Step 4: Correr toda la suite**

Run: `npm test`
Expected: PASS (todos los archivos, incluidos los nuevos paneles y el handler de grupos).

- [ ] **Step 5: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(predicciones): el resumen reemplaza al Hub en /predicciones"
```

---

### Task 9: Actualizar smoke y verificación final

**Files:**
- Modify: `scripts/dev-smoke.mjs:24-29`

- [ ] **Step 1: Reescribir el paso 2 del smoke**

En `scripts/dev-smoke.mjs`, reemplazar el bloque del paso 2 (líneas 24-29, desde el comentario `// 2) Predicciones …` hasta su `check(...)`) por:

```js
  // 2) Predicciones → resumen tabbed por fase (tab Grupos por defecto). Cambiar de tab y
  //    entrar al editor de un grupo desde el resumen (consume /groups + /groups/predictions/me).
  await page.getByRole('link', { name: 'Predicciones' }).click()
  await page.getByRole('heading', { name: /^Predicciones$/ }).waitFor({ timeout: 8000 })
  await page.getByText('Grupo A').first().waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: 'Eliminatorias' }).click()
  await page.getByText(/Dieciseisavos|Octavos/).first().waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: 'Grupos' }).click()
  await page.getByRole('link', { name: /Grupo A/ }).first().click()
  await page.getByText(/12 de 12 listos/).waitFor({ timeout: 8000 })
  check(true, 'Predicciones: resumen por fase (tabs) → editor de grupo (12 de 12 listos)')
```

- [ ] **Step 2: Lint del proyecto completo**

Run: `npm run lint`
Expected: sin errores ni warnings nuevos.

- [ ] **Step 3: Typecheck + tests finales**

Run: `npx tsc -b && npm test`
Expected: PASS.

- [ ] **Step 4: (Manual, requiere dev server) Smoke real de navegador**

En una terminal: `VITE_USE_MOCKS=true npm run dev`
En otra: `SMOKE_BASE=http://localhost:5173 npm run smoke`
Expected: todos los `✓`, incluido el paso 2 reescrito y `sin errores de página JS (0)`.

- [ ] **Step 5: Commit**

```bash
git add scripts/dev-smoke.mjs
git commit -m "test(smoke): recorre el resumen de pronósticos por fase"
```

---

## Notas de implementación

- **Regla de "marcas" (aciertos/puntos por ítem):** se muestran solo cuando `locked` es true (torneo iniciado) y el ítem trae resultado (`result`/`pointsEarned`/`result` no nulos). Antes del cierre se ve solo el pronóstico. El mock siembra resultados desde el inicio, por eso los tests fuerzan el estado vía el prop `locked` (paneles) o `setNow(db.tournamentStartAt)` (pantalla).
- **Subtotales:** Grupos/Terceros/Eliminatorias leen `breakdown.{groups|thirds|ko}` vía `useMyTotals`; Powerups usa `pointsEarned.total` (equivale a `darkHorse + disappointment`). El total global del header sale de `breakdown.total`.
- **`useAllKoPredictions`** dispara las 6 rondas; en el seed solo `r32` y `r16` tienen partidos, así que el panel solo renderiza esas dos secciones (filtra `matches.length > 0`). Cuando lleguen más rondas, aparecen solas.
- **Edición:** cada fila es un `<Link>` al editor existente (`/predicciones/grupos`, `/predicciones/terceros`, `/eliminatorias/partido/:id`, `/predicciones/powerups`), que ya respeta `locked` (solo lectura con el torneo iniciado).
- **Fuera de alcance (mejora opcional):** deep-link a un grupo concreto dentro del deck (`?group=`); hoy abre en el primer grupo.
```
