# Tabla (podio + detalle) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la Tabla pelada por una pantalla tipo Kahoot: podio navy con el top 3, lista del resto con resaltado de "mi" fila, y al tocar un jugador un bottom-sheet con su desglose de puntos por categoría.

**Architecture:** `Scoreboard` compone un `Podium` presentacional (top 3) + una lista (resto) y abre un `Sheet` con `PlayerBreakdown` (autocontenido, usa `useBreakdown`). `PlayerBreakdown` se reutiliza en la ruta full-screen `/tabla/:participantId` (`Breakdown`). Se reutilizan `Sheet`/`Avatar` y se extiende `Sheet` con `ariaLabel`.

**Tech Stack:** React 18 + TypeScript, Vite, TanStack Query, Framer Motion 12, Tailwind v4, `@phosphor-icons/react` 2, MSW + Vitest + Testing Library.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/ui/Sheet.tsx` | **Modificar** | Añadir prop opcional `ariaLabel` (dialog `aria-label = ariaLabel ?? title`). |
| `src/ui/Sheet.test.tsx` | **Modificar** | Caso: `ariaLabel` nombra el dialog sin título visible. |
| `src/features/scoreboard/format.ts` | **Crear** | `formatCOP(n)` — formato `$1.000.000` determinista (sin Intl). |
| `src/features/scoreboard/format.test.ts` | **Crear** | Unit test de `formatCOP`. |
| `src/features/scoreboard/Podium.tsx` | **Crear** | Podio navy (top 3, orden 2-1-3, 1º coronado + premio). Presentacional. |
| `src/features/scoreboard/PlayerBreakdown.tsx` | **Crear** | Detalle autocontenido (cabecera+total+premio+categorías). Usa `useBreakdown`. |
| `src/features/scoreboard/Scoreboard.tsx` | **Reescribir** | Hero navy + podio + lista + "yo" + estados; tap abre `Sheet`. |
| `src/features/scoreboard/Scoreboard.test.tsx` | **Crear** | Podio + resaltado "TÚ" + abrir detalle con desglose. |
| `src/features/scoreboard/Breakdown.tsx` | **Reescribir** | Wrapper full-screen para `/tabla/:participantId` (reutiliza `PlayerBreakdown`). |
| `scripts/dev-smoke.mjs` | **Modificar** | Actualizar las aserciones de la Tabla (heading + estructura cambian). |

Hooks (`useScoreboard`, `useBreakdown`), `api.ts`, tipos y handlers: **sin cambios**.

---

## Task 1: Extender `Sheet` con `ariaLabel`

**Files:**
- Modify: `src/ui/Sheet.tsx`
- Modify: `src/ui/Sheet.test.tsx`

- [ ] **Step 1: Añadir el caso de test (falla)**

En `src/ui/Sheet.test.tsx`, añade dentro del `describe('Sheet', ...)`:

```tsx
  it('usa ariaLabel para nombrar el dialog cuando no hay título visible', () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="Juan">
        <p>c</p>
      </Sheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Juan' })).toBeInTheDocument()
  })
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test -- src/ui/Sheet.test.tsx`
Expected: FAIL (sin `ariaLabel`, el dialog no tiene nombre "Juan").

- [ ] **Step 3: Implementar la prop**

En `src/ui/Sheet.tsx`, cambia la firma y el `aria-label`:

```tsx
export function Sheet({
  open,
  onClose,
  title,
  ariaLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  ariaLabel?: string
  children: ReactNode
}) {
```

y en el `motion.div` del panel:

```tsx
            aria-label={ariaLabel ?? title}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm run test -- src/ui/Sheet.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Sheet.tsx src/ui/Sheet.test.tsx
git commit -m "feat(ui): Sheet acepta ariaLabel para nombrar el dialog sin título"
```

---

## Task 2: Helper `formatCOP`

**Files:**
- Create: `src/features/scoreboard/format.ts`
- Test: `src/features/scoreboard/format.test.ts`

- [ ] **Step 1: Escribir el test (falla)**

```ts
// src/features/scoreboard/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatCOP } from './format'

describe('formatCOP', () => {
  it('agrupa miles con puntos y antepone $', () => {
    expect(formatCOP(700000)).toBe('$700.000')
    expect(formatCOP(50000)).toBe('$50.000')
    expect(formatCOP(1000000)).toBe('$1.000.000')
    expect(formatCOP(0)).toBe('$0')
  })
})
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test -- src/features/scoreboard/format.test.ts`
Expected: FAIL ("Failed to resolve import './format'").

- [ ] **Step 3: Implementar**

```ts
// src/features/scoreboard/format.ts
export function formatCOP(n: number): string {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm run test -- src/features/scoreboard/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/scoreboard/format.ts src/features/scoreboard/format.test.ts
git commit -m "feat(scoreboard): helper formatCOP"
```

---

## Task 3: `Podium` (presentacional)

**Files:**
- Create: `src/features/scoreboard/Podium.tsx`

> Presentacional, sin fetching. Cubierto por el test de `Scoreboard` (Task 5).

- [ ] **Step 1: Crear `src/features/scoreboard/Podium.tsx`**

```tsx
import { Crown } from '@phosphor-icons/react'
import type { ScoreboardEntry } from '../../types/api'
import { Avatar } from '../../ui/Avatar'
import { formatCOP } from './format'

const FIRST_BG = 'linear-gradient(180deg, #7d54e6, #5a28bf)'
const SIDE_BG = 'linear-gradient(180deg, #4b3a82, #2f2563)'
const PRIZE_BG = 'linear-gradient(135deg, #f3d27a, #d8af52)'

export function Podium({
  entries,
  meId,
  onPick,
}: {
  entries: ScoreboardEntry[]
  meId: string | null
  onPick: (e: ScoreboardEntry) => void
}) {
  const slots = [
    { e: entries[1], place: 2, h: 70 },
    { e: entries[0], place: 1, h: 96 },
    { e: entries[2], place: 3, h: 52 },
  ]
  return (
    <div className="flex items-end justify-center gap-2.5">
      {slots.map(({ e, place, h }) => {
        if (!e) return <div key={place} className="flex-1" />
        const isFirst = place === 1
        const isMe = e.participant.id === meId
        const ring = isFirst ? 'ring-2 ring-gold' : isMe ? 'ring-2 ring-violet-light' : ''
        return (
          <button
            key={place}
            onClick={() => onPick(e)}
            className="flex flex-1 flex-col items-center gap-1.5 active:scale-[0.98]"
          >
            {isFirst && <Crown size={20} weight="fill" className="text-gold" />}
            <span className={`inline-flex rounded-full ${ring}`}>
              <Avatar name={e.participant.name} size={isFirst ? 54 : 42} />
            </span>
            <span className="text-center font-display text-[13px] font-bold leading-tight text-white">
              {e.participant.name}
            </span>
            <span className="font-mono text-xs font-bold text-violet-light">{e.total} pts</span>
            {isMe && (
              <span className="rounded-full border border-violet-light px-2 py-0.5 font-display text-[10px] font-bold text-violet-light">
                TÚ
              </span>
            )}
            {e.prize != null && (
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold text-ink"
                style={{ background: PRIZE_BG }}
              >
                {formatCOP(e.prize)}
              </span>
            )}
            <span
              className="mt-1 grid w-full place-items-center rounded-t-[14px] pt-2 font-mono text-lg font-bold text-white"
              style={{ height: h, alignContent: 'start', background: isFirst ? FIRST_BG : SIDE_BG }}
            >
              {place}
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/scoreboard/Podium.tsx
git commit -m "feat(scoreboard): Podium navy (top 3, 1º coronado + premio)"
```

---

## Task 4: `PlayerBreakdown` (detalle por categoría)

**Files:**
- Create: `src/features/scoreboard/PlayerBreakdown.tsx`

> Cubierto por el test de `Scoreboard` (Task 5).

- [ ] **Step 1: Crear `src/features/scoreboard/PlayerBreakdown.tsx`**

```tsx
import { type ReactNode } from 'react'
import { SquaresFour, Sword, Medal, Horse, TrendDown } from '@phosphor-icons/react'
import { useBreakdown } from './hooks'
import { Avatar } from '../../ui/Avatar'
import { formatCOP } from './format'

export function PlayerBreakdown({ participantId, rank }: { participantId: string; rank?: number }) {
  const q = useBreakdown(participantId)
  if (q.isLoading) return <BreakdownSkeleton />
  if (q.error || !q.data) {
    return (
      <p role="alert" className="px-4 py-8 text-center text-danger">
        No se pudo cargar el desglose.
      </p>
    )
  }
  const b = q.data
  const bd = b.breakdown
  const maxPos = Math.max(1, bd.groups, bd.ko, bd.thirds, bd.darkHorse)
  const topRank = rank != null && rank <= 3

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-3 pt-1">
        <Avatar name={b.participant.name} size={46} />
        <div className="flex-1">
          <p className="font-display text-lg font-extrabold text-ink">{b.participant.name}</p>
          {rank != null && (
            <span
              className={`inline-block rounded-full border px-2 py-0.5 font-mono text-xs font-bold ${
                topRank ? 'border-gold text-gold' : 'border-border text-ink-soft'
              }`}
            >
              #{rank}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold leading-none text-ink">{b.total}</p>
          <p className="text-xs text-ink-soft">puntos</p>
        </div>
      </div>

      {b.prize != null && (
        <div className="mt-3 flex items-center gap-2 rounded-control border border-gold/30 bg-[#f8f2e4] px-3 py-2.5">
          <span className="font-display font-bold text-ink">Premio</span>
          <span className="ml-auto font-mono font-bold text-gold">{formatCOP(b.prize)}</span>
        </div>
      )}

      <p className="px-1 pb-1 pt-4 font-mono text-[10.5px] font-bold tracking-wide text-muted">
        DE DÓNDE SALEN SUS PUNTOS
      </p>

      <CategoryRow icon={<SquaresFour size={18} weight="bold" />} label="Grupos" display={`${bd.groups}`} pct={(bd.groups / maxPos) * 100} />
      <CategoryRow icon={<Sword size={18} weight="bold" />} label="Eliminatorias" display={`${bd.ko}`} pct={(bd.ko / maxPos) * 100} />
      <CategoryRow icon={<Medal size={18} weight="bold" />} label="Terceros" display={`${bd.thirds}`} pct={(bd.thirds / maxPos) * 100} />
      <CategoryRow
        icon={<Horse size={18} weight="bold" />}
        label="Caballo oscuro"
        display={bd.darkHorse > 0 ? `+${bd.darkHorse}` : `${bd.darkHorse}`}
        pct={(Math.max(0, bd.darkHorse) / maxPos) * 100}
      />

      <div className="my-2 h-px bg-border" />

      <div className="flex items-center gap-3 py-2">
        <span className="grid size-9 place-items-center rounded-[10px] bg-[#fdeede] text-lock">
          <TrendDown size={18} weight="bold" />
        </span>
        <span className="flex-1 font-display font-bold text-ink">Decepción</span>
        <span className="w-16 text-right font-mono font-bold text-lock">{bd.disappointment}</span>
      </div>
    </div>
  )
}

function CategoryRow({ icon, label, display, pct }: { icon: ReactNode; label: string; display: string; pct: number }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="grid size-9 place-items-center rounded-[10px] bg-tint text-violet">{icon}</span>
      <span className="flex-1">
        <span className="block font-display text-sm font-bold text-ink">{label}</span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full bg-violet-light"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </span>
      </span>
      <span className="w-16 text-right font-mono font-bold text-ink">{display}</span>
    </div>
  )
}

function BreakdownSkeleton() {
  return (
    <div className="px-4 pb-4 pt-2">
      <div className="h-12 animate-pulse rounded-2xl bg-surface-2" aria-busy />
      <div className="mt-3 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/scoreboard/PlayerBreakdown.tsx
git commit -m "feat(scoreboard): PlayerBreakdown (desglose por categoría reutilizable)"
```

---

## Task 5: Reescribir `Scoreboard` (podio + lista + sheet)

**Files:**
- Modify (reescribir): `src/features/scoreboard/Scoreboard.tsx`
- Test (crear): `src/features/scoreboard/Scoreboard.test.tsx`

Contexto seed: scoreboard = Juan #1 (463, $700.000), María #2 (463, $250.000), Luis #3 (90, $50.000), Pedro #4 (0, sin premio). Breakdown de Juan: Grupos 360, Eliminatorias 50, Terceros 40, Caballo oscuro +16, Decepción −3, total 463.

- [ ] **Step 1: Escribir el test (falla)**

```tsx
// src/features/scoreboard/Scoreboard.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { Scoreboard } from './Scoreboard'

describe('Scoreboard', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-pedro' // pedro: #4 (fuera del podio) → fila resaltada "TÚ"
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
    await within(dialog).findByText('463') // total
    expect(within(dialog).getByText('360')).toBeInTheDocument() // grupos
    expect(within(dialog).getByText('50')).toBeInTheDocument() // eliminatorias
    expect(within(dialog).getByText('40')).toBeInTheDocument() // terceros
    expect(within(dialog).getByText('+16')).toBeInTheDocument() // caballo oscuro
    expect(within(dialog).getByText('-3')).toBeInTheDocument() // decepción
  })
})
```

- [ ] **Step 2: Correr y ver que falla**

Run: `npm run test -- src/features/scoreboard/Scoreboard.test.tsx`
Expected: FAIL (el componente viejo usa `<ol><li>` con texto "#1 Juan", no botones con `aria` ni el desglose en un dialog).

- [ ] **Step 3: Reescribir `src/features/scoreboard/Scoreboard.tsx`**

```tsx
import { useState } from 'react'
import { useScoreboard } from './hooks'
import { useAuth } from '../../auth/useAuth'
import type { ScoreboardEntry } from '../../types/api'
import { Avatar } from '../../ui/Avatar'
import { Button } from '../../ui/Button'
import { Sheet } from '../../ui/Sheet'
import { Podium } from './Podium'
import { PlayerBreakdown } from './PlayerBreakdown'

const NAVY_BG = 'radial-gradient(120% 80% at 50% -10%, #2a1d5e 0%, #150f33 55%, #0d0a22 100%)'

export function Scoreboard() {
  const q = useScoreboard()
  const { participant } = useAuth()
  const meId = participant?.id ?? null
  const [selected, setSelected] = useState<ScoreboardEntry | null>(null)

  if (q.isLoading) return <ScoreboardSkeleton />
  if (q.error) return <ScoreboardError onRetry={() => q.refetch()} />

  const data = q.data?.data ?? []
  const allZero = data.every((e) => e.total === 0)
  if (data.length === 0 || allZero) return <ScoreboardEmpty />

  const top3 = data.slice(0, 3)
  const rest = data.slice(3)

  return (
    <div className="-mx-5 -mt-3">
      <div className="px-5 pb-7 pt-5 text-white" style={{ background: NAVY_BG }}>
        <h1 className="font-display text-2xl font-black">Tabla</h1>
        {q.data && (
          <p className="font-mono text-[10.5px] tracking-wide text-violet-light">ACTUALIZADO {formatUpdated(q.data.updatedAt)}</p>
        )}
        <div className="mt-5">
          <Podium entries={top3} meId={meId} onPick={setSelected} />
        </div>
      </div>

      <div className="-mt-4 rounded-t-[22px] bg-bg px-5 pt-5">
        {rest.length > 0 && (
          <p className="mb-2 font-mono text-[10.5px] font-bold tracking-wide text-muted">DEMÁS JUGADORES</p>
        )}
        <ul className="space-y-2">
          {rest.map((e) => {
            const isMe = e.participant.id === meId
            return (
              <li key={e.participant.id}>
                <button
                  onClick={() => setSelected(e)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                    isMe ? 'border-violet bg-tint' : 'border-border bg-surface'
                  }`}
                >
                  <span className="w-5 text-center font-mono text-sm font-bold text-muted">{e.rank}</span>
                  <Avatar name={e.participant.name} size={30} />
                  <span className="flex-1 font-display font-bold text-ink">{e.participant.name}</span>
                  {isMe && (
                    <span className="rounded-full border border-violet bg-surface px-2 py-0.5 font-display text-[10px] font-bold text-violet">
                      TÚ
                    </span>
                  )}
                  <span className="font-mono text-sm font-bold text-ink">{e.total} pts</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} ariaLabel={selected?.participant.name}>
        {selected && <PlayerBreakdown participantId={selected.participant.id} rank={selected.rank} />}
      </Sheet>
    </div>
  )
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function ScoreboardSkeleton() {
  return (
    <div className="-mx-5 -mt-3">
      <div className="px-5 pb-7 pt-5" style={{ background: NAVY_BG }}>
        <div className="h-7 w-24 animate-pulse rounded bg-white/10" aria-busy />
        <div className="mt-5 flex items-end justify-center gap-2.5">
          <div className="h-[70px] flex-1 animate-pulse rounded-t-[14px] bg-white/10" />
          <div className="h-[96px] flex-1 animate-pulse rounded-t-[14px] bg-white/10" />
          <div className="h-[52px] flex-1 animate-pulse rounded-t-[14px] bg-white/10" />
        </div>
      </div>
      <div className="-mt-4 rounded-t-[22px] bg-bg px-5 pt-5">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-surface-2" />
          ))}
        </div>
      </div>
    </div>
  )
}

function ScoreboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <p className="text-ink-soft">No pudimos cargar la tabla.</p>
      <Button className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

function ScoreboardEmpty() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <h1 className="font-display text-xl font-extrabold text-ink">Tabla</h1>
      <p className="mt-2 text-ink-soft">La tabla se llena cuando empiecen los partidos.</p>
    </div>
  )
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `npm run test -- src/features/scoreboard/Scoreboard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/scoreboard/Scoreboard.tsx src/features/scoreboard/Scoreboard.test.tsx
git commit -m "feat(tabla): podio navy + lista con resaltado propio y detalle en sheet"
```

---

## Task 6: Reescribir `Breakdown` (ruta full-screen) y actualizar el smoke

**Files:**
- Modify (reescribir): `src/features/scoreboard/Breakdown.tsx`
- Modify: `scripts/dev-smoke.mjs`

- [ ] **Step 1: Reescribir `src/features/scoreboard/Breakdown.tsx`**

```tsx
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { PlayerBreakdown } from './PlayerBreakdown'

export function Breakdown() {
  const { participantId = '' } = useParams()
  const nav = useNavigate()
  return (
    <div>
      <button
        onClick={() => nav('/tabla')}
        aria-label="Volver a la tabla"
        className="mb-3 inline-flex items-center gap-2 font-display font-semibold text-ink-soft active:scale-95"
      >
        <ArrowLeft size={20} weight="bold" /> Tabla
      </button>
      <PlayerBreakdown participantId={participantId} />
    </div>
  )
}
```

- [ ] **Step 2: Actualizar las aserciones de la Tabla en `scripts/dev-smoke.mjs`**

Reemplaza el bloque actual de la sección "3) Tabla":

```js
  // 3) Tabla consume /scoreboard (Juan 1º por desempate)
  await page.getByRole('link', { name: 'Tabla' }).click()
  await page.getByRole('heading', { name: /Tabla de posiciones/i }).waitFor({ timeout: 8000 })
  const firstRow = (await page.locator('ol li').first().innerText()).trim()
  check(/#1\s+Juan/.test(firstRow), `Tabla consume /scoreboard (1º: "${firstRow}")`)
```

por:

```js
  // 3) Tabla: podio (Juan 1º) + detalle en sheet
  await page.getByRole('link', { name: 'Tabla' }).click()
  await page.getByRole('heading', { name: /^Tabla$/ }).waitFor({ timeout: 8000 })
  await page.getByRole('button', { name: /Juan/i }).first().click()
  await page.getByRole('dialog', { name: 'Juan' }).waitFor({ timeout: 8000 })
  check(true, 'Tabla: podio + detalle de Juan (sheet)')
  await page.keyboard.press('Escape') // cierra el sheet antes de seguir navegando
```

- [ ] **Step 3: Verificar tipos, lint y toda la suite**

Run: `npx tsc -b && npm run lint && npm run test`
Expected: PASS — `tsc` sin errores, `eslint` limpio, todos los tests verdes (incluidos `Sheet.test.tsx`, `format.test.ts`, `Scoreboard.test.tsx`, y los existentes `scoreboard.test.ts`/`scoring.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add src/features/scoreboard/Breakdown.tsx scripts/dev-smoke.mjs
git commit -m "feat(tabla): detalle full-screen reutiliza PlayerBreakdown; actualiza smoke"
```

---

## Task 7: Verificación end-to-end y build

**Files:** ninguno (verificación).

- [ ] **Step 1: Build de producción**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 2: Smoke del repo (incluye la Tabla nueva)**

Levanta el dev server con mocks y corre el smoke:

```bash
VITE_USE_MOCKS=true npm run dev   # en background; nota el puerto (5173/5174)
SMOKE_BASE=http://localhost:<puerto> npm run smoke
```

Expected: todos los `✓`, incluido "Tabla: podio + detalle de Juan (sheet)", con 0 errores de página JS.

- [ ] **Step 3: Smoke manual de la Tabla (navegador)**

Con el dev server arriba, login como Juan → pestaña **Tabla**:
1. Podio navy con Juan (1º, coronado, $700.000), María (2º), Luis (3º); puntos en mono.
2. Debajo, Pedro (#4) en la lista; si entras como un usuario fuera del podio, su fila va resaltada con "TÚ".
3. Tocar a cualquier jugador abre el sheet con su desglose (Grupos/Eliminatorias/Terceros/Caballo oscuro/Decepción) + total + premio. Cierra con tap-afuera/Esc.
4. `/tabla/p-juan` directo muestra el mismo desglose en pantalla completa con botón "Tabla" para volver.

Expected: el flujo funciona; cero errores en consola.

- [ ] **Step 4: Detener el dev server**

```bash
kill <PID del dev server>
```

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** §3.1 Tabla → Task 5; §3.2 PlayerBreakdown → Task 4; §3.3 Breakdown full-screen → Task 6; §3.4 Podium → Task 3; extensión `Sheet ariaLabel` → Task 1; `formatCOP` → Task 2; estados loading/error/empty → Task 5; pruebas → Tasks 1,2,5 + verificación 6/7; actualización del smoke (regresión detectada) → Task 6.
- **Sin placeholders:** todo el código está completo; comandos con salida esperada.
- **Consistencia de tipos:** `ScoreboardEntry`/`ScoreBreakdown` usados según `src/types/api.ts`; `Podium` props `{entries, meId, onPick}`, `PlayerBreakdown` props `{participantId, rank?}`, `Sheet` con `ariaLabel?`; `formatCOP` con la misma firma en todos los usos. Valores del desglose de Juan (360/50/40/+16/−3, total 463) verificados contra `scoring.ts` + seed.
