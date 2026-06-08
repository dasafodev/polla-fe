# Terceros y Powerups — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los placeholders de los pasos 2 (Terceros) y 3 (Powerups) del wizard de onboarding por pantallas reales, estilizadas y cableadas a los hooks de dominio, y reutilizarlas en las rutas `/predicciones/terceros` y `/predicciones/powerups`.

**Architecture:** Cada paso es un componente *mode-aware*: con `onComplete` (wizard) muestra un footer fijo que guarda y avanza; sin él (standalone, dentro de `AppShell`) muestra el CTA inline y una confirmación "Guardado". Se reutiliza el sistema de diseño de la Entrega 2 (tokens, `Button`, `Confetti`, `motion`) y se añaden dos primitivas reutilizables: `Flag` (extraída de `GroupCard`), `Sheet` (bottom-sheet genérico) y el chrome `WizardFooter`.

**Tech Stack:** React 18 + TypeScript, Vite, TanStack Query, Framer Motion 12, Tailwind v4 (CSS-first), `@phosphor-icons/react` 2, MSW + Vitest + Testing Library.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/ui/Flag.tsx` | **Crear** | Bandera placeholder (gradiente determinista por `code`). Extraída de `GroupCard`. |
| `src/ui/Sheet.tsx` | **Crear** | Bottom-sheet genérico (slide-up, scrim, grab, Esc/backdrop, reduced-motion). |
| `src/features/onboarding/WizardFooter.tsx` | **Crear** | Footer fijo compartido (barra blur + wrapper `max-w-[480px]`). |
| `src/features/groups/GroupCard.tsx` | **Modificar** | Usar `ui/Flag` en vez del `Flag` local. |
| `src/features/groups/Thirds.tsx` | **Reescribir** | Grilla 2-col de terceros, contador + 8 pips, tope de 8, estados. |
| `src/features/groups/Thirds.test.tsx` | **Reescribir** | Tests de la nueva grilla (toggle, tope, guardar). |
| `src/features/powerups/Powerups.tsx` | **Crear (rename de PowerupsForm)** | Tarjetas temáticas + `TeamPickerSheet`, cierre con confeti. |
| `src/features/powerups/TeamPickerSheet.tsx` | **Crear** | `Sheet` + lista single-select con buscador. |
| `src/features/powerups/Powerups.test.tsx` | **Crear** | Tests de create/update vía sheet. |
| `src/features/powerups/PowerupsForm.tsx` | **Borrar** | Reemplazado por `Powerups.tsx`. |
| `src/features/onboarding/OnboardingLayout.tsx` | **Modificar** | Renderiza `Thirds`/`Powerups`; elimina footer global hardcodeado. |
| `src/features/onboarding/StepPlaceholder.tsx` | **Borrar** | Queda sin uso. |
| `src/app/router.tsx` | **Modificar** | Import/elemento `PowerupsForm` → `Powerups`. |

---

## Task 1: Extraer la primitiva `Flag`

**Files:**
- Create: `src/ui/Flag.tsx`
- Modify: `src/features/groups/GroupCard.tsx`

- [ ] **Step 1: Crear `src/ui/Flag.tsx`**

```tsx
export function Flag({ code, className = 'size-7' }: { code: string; className?: string }) {
  const hueA = (code.charCodeAt(0) * 47) % 360
  const hueB = (code.charCodeAt(Math.min(1, code.length - 1)) * 83) % 360
  return (
    <span
      className={`${className} shrink-0 overflow-hidden rounded-md border border-border`}
      aria-hidden
      style={{ background: `linear-gradient(135deg, hsl(${hueA} 60% 55%), hsl(${hueB} 60% 45%))` }}
    />
  )
}
```

- [ ] **Step 2: Usar `Flag` en `GroupCard.tsx`**

En `src/features/groups/GroupCard.tsx`, añade el import al inicio (junto a los otros imports):

```tsx
import { Flag } from '../../ui/Flag'
```

Elimina la función local `Flag` del final del archivo (las líneas `function Flag({ code }: { code: string }) { ... }`). El uso `<Flag code={t.code} />` dentro del componente queda igual (ahora usa la primitiva, tamaño por defecto `size-7`, idéntico al actual).

- [ ] **Step 3: Verificar tipos y tests de grupos siguen verdes**

Run: `npx tsc -b --noEmit && npm run test -- src/features/groups`
Expected: PASS (sin errores de tipo; `GroupDeck.test.tsx` y `Thirds.test.tsx` actuales siguen pasando — `Thirds.test.tsx` se reescribe en la Task 4).

- [ ] **Step 4: Commit**

```bash
git add src/ui/Flag.tsx src/features/groups/GroupCard.tsx
git commit -m "refactor(ui): extrae primitiva Flag y la usa en GroupCard"
```

---

## Task 2: Primitiva `Sheet` (bottom-sheet)

**Files:**
- Create: `src/ui/Sheet.tsx`
- Test: `src/ui/Sheet.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
// src/ui/Sheet.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sheet } from './Sheet'

describe('Sheet', () => {
  it('cuando open=true muestra el contenido en un dialog con su título', () => {
    render(
      <Sheet open onClose={() => {}} title="Caballo oscuro">
        <p>contenido</p>
      </Sheet>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Caballo oscuro' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('contenido')).toBeInTheDocument()
  })

  it('llama onClose al presionar Escape', async () => {
    const onClose = vi.fn()
    render(
      <Sheet open onClose={onClose} title="X">
        <p>c</p>
      </Sheet>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cuando open=false no renderiza el dialog', () => {
    render(
      <Sheet open={false} onClose={() => {}} title="X">
        <p>c</p>
      </Sheet>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr el test para verque falla**

Run: `npm run test -- src/ui/Sheet.test.tsx`
Expected: FAIL ("Failed to resolve import './Sheet'" o "Sheet is not defined").

- [ ] **Step 3: Implementar `src/ui/Sheet.tsx`**

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import { useReduced, springSoft } from './motion'

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  const reduced = useReduced()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-navy/45"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[80%] max-w-[480px] flex-col rounded-t-[24px] bg-surface shadow-diffuse focus:outline-none"
            initial={reduced ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={springSoft}
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-border" aria-hidden />
            {title && (
              <div className="flex items-center justify-between px-5 pb-2 pt-3">
                <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
                <button
                  onClick={onClose}
                  aria-label="Cerrar"
                  className="grid size-9 place-items-center rounded-full text-muted active:scale-95"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm run test -- src/ui/Sheet.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Sheet.tsx src/ui/Sheet.test.tsx
git commit -m "feat(ui): bottom-sheet Sheet (slide-up, Esc/backdrop, reduced-motion)"
```

---

## Task 3: `WizardFooter` (footer fijo compartido)

**Files:**
- Create: `src/features/onboarding/WizardFooter.tsx`

> Componente presentacional trivial (un wrapper). No lleva test aislado; queda cubierto por el render de `Thirds`/`Powerups` en modo wizard (Tasks 4 y 6).

- [ ] **Step 1: Crear `src/features/onboarding/WizardFooter.tsx`**

```tsx
import { type ReactNode } from 'react'

export function WizardFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-md">
      <div className="mx-auto max-w-[480px]">{children}</div>
    </footer>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/WizardFooter.tsx
git commit -m "feat(onboarding): WizardFooter (chrome de footer fijo reutilizable)"
```

---

## Task 4: Reescribir `Thirds` (grilla de terceros)

**Files:**
- Modify (reescribir): `src/features/groups/Thirds.tsx`
- Test (reescribir): `src/features/groups/Thirds.test.tsx`

Contexto de datos (seed): `p-juan` tiene 12 grupos completos → `useThirds().data.data` trae 12 candidatos (`tA3..tL3`), de los cuales 8 (`tA3..tH3`) vienen `selected: true`. Nombres: `Equipo A3`, código `A3`, `label` `A`.

- [ ] **Step 1: Reescribir el test (falla con el componente viejo)**

```tsx
// src/features/groups/Thirds.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { Thirds } from './Thirds'

describe('Thirds', () => {
  beforeEach(() => {
    db.currentSessionId = 'p-juan' // 12 candidatos, 8 seleccionados en el seed
  })

  it('parte con 8 de 8 y deseleccionar todo deja 0 de 8 (no revierte al server)', async () => {
    renderWithProviders(<Thirds />)
    await screen.findByText('8 de 8 elegidos')
    const selected = screen.getAllByRole('button', { pressed: true })
    expect(selected).toHaveLength(8)
    for (const b of selected) await userEvent.click(b)
    await screen.findByText('0 de 8 elegidos')
  })

  it('con 8 elegidos, los candidatos no elegidos quedan deshabilitados (tope de 8)', async () => {
    renderWithProviders(<Thirds />)
    await screen.findByText('8 de 8 elegidos')
    const unselected = screen.getAllByRole('button', { pressed: false })
    expect(unselected).toHaveLength(4) // 12 candidatos − 8 elegidos
    for (const b of unselected) expect(b).toBeDisabled()
  })

  it('guarda los 8 terceros y muestra confirmación (modo standalone)', async () => {
    renderWithProviders(<Thirds />)
    await screen.findByText('8 de 8 elegidos')
    const save = screen.getByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByText('Guardado')
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm run test -- src/features/groups/Thirds.test.tsx`
Expected: FAIL (el componente viejo no tiene el texto "8 de 8 elegidos" ni botones con `aria-pressed`).

- [ ] **Step 3: Reescribir `src/features/groups/Thirds.tsx`**

```tsx
import { useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { useThirds, useSaveThirds, useFriendsGroups } from './hooks'
import { isApiError } from '../../lib/errors'
import { Button } from '../../ui/Button'
import { Flag } from '../../ui/Flag'
import { WizardFooter } from '../onboarding/WizardFooter'

const TARGET = 8

export function Thirds({ onComplete }: { onComplete?: () => void }) {
  const thirds = useThirds()
  const friends = useFriendsGroups()
  const save = useSaveThirds()
  const wizard = !!onComplete
  const locked = friends.data?.available === true

  // null = sin ediciones (usa la selección del server); [] = el usuario deseleccionó todo (válido).
  const [picked, setPicked] = useState<string[] | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  if (thirds.isLoading) return <ThirdsSkeleton wizard={wizard} />
  if (thirds.isError) return <ThirdsError onRetry={() => thirds.refetch()} />

  const data = thirds.data?.data ?? []
  const serverSelected = data.filter((c) => c.selected).map((c) => c.teamId)
  const selected = picked ?? serverSelected
  const count = selected.length
  const full = count === TARGET

  if (data.length < TARGET) return <ThirdsEmpty wizard={wizard} />

  function toggle(teamId: string) {
    setError('')
    setSaved(false)
    setPicked((prev) => {
      const base = prev ?? serverSelected
      if (base.includes(teamId)) return base.filter((x) => x !== teamId)
      if (base.length >= TARGET) return base // tope de 8
      return [...base, teamId]
    })
  }

  function onSave() {
    setError('')
    setSaved(false)
    save.mutate(
      { teamIds: selected },
      {
        onSuccess: () => {
          if (wizard) onComplete!()
          else setSaved(true)
        },
        onError: (e) => setError(isApiError(e) ? e.message : 'No se pudo guardar'),
      },
    )
  }

  const cta = (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <span aria-live="polite" className="font-mono text-sm font-bold text-ink">
          {count} de {TARGET} elegidos
        </span>
        <span className="flex gap-1.5" aria-hidden>
          {Array.from({ length: TARGET }).map((_, i) => (
            <i key={i} className={`size-2 rounded-full ${i < count ? 'bg-violet' : 'bg-border'}`} />
          ))}
        </span>
      </div>
      <Button fullWidth loading={save.isPending} disabled={!full || locked} onClick={onSave}>
        {wizard ? (full ? 'Guardar y continuar' : `Elige ${TARGET - count} más`) : 'Guardar'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-2 text-center text-sm text-success">
          Guardado
        </p>
      )}
    </div>
  )

  return (
    <>
      {!wizard && (
        <header className="mb-5">
          <h1 className="font-display text-2xl font-extrabold text-ink">Mejores terceros</h1>
          <p className="mt-1 text-ink-soft">Elige los 8 que crees que clasifican.</p>
        </header>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {data.map((c) => {
          const isSel = selected.includes(c.teamId)
          return (
            <button
              key={c.teamId}
              type="button"
              aria-pressed={isSel}
              disabled={locked || (!isSel && full)}
              onClick={() => toggle(c.teamId)}
              className={`relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-40 ${
                isSel ? 'border-violet bg-tint' : 'border-border bg-surface'
              }`}
            >
              <span
                className={`absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full border ${
                  isSel ? 'border-violet bg-violet text-white' : 'border-border bg-surface'
                }`}
                aria-hidden
              >
                {isSel && <Check size={13} weight="bold" />}
              </span>
              <Flag code={c.code} />
              <span className="font-display text-sm font-bold leading-tight text-ink">{c.name}</span>
              <span className="text-xs text-ink-soft">Grupo {c.label}</span>
            </button>
          )
        })}
      </div>

      {locked && (
        <p className="mt-3 text-center text-sm font-medium text-lock">
          Las predicciones están cerradas. Solo lectura.
        </p>
      )}

      {wizard ? <WizardFooter>{cta}</WizardFooter> : <div className="mt-6">{cta}</div>}
    </>
  )
}

function ThirdsSkeleton({ wizard }: { wizard: boolean }) {
  return (
    <div className={wizard ? '' : 'mt-2'}>
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" aria-busy />
        ))}
      </div>
    </div>
  )
}

function ThirdsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <p className="text-ink-soft">No pudimos cargar los terceros.</p>
      <Button className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}

function ThirdsEmpty({ wizard }: { wizard: boolean }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-8 text-center ${wizard ? '' : 'mt-2'}`}>
      <p className="font-display text-lg font-bold text-ink">Aún no hay candidatos suficientes</p>
      <p className="mt-2 text-ink-soft">Completa los 12 grupos primero para elegir los 8 mejores terceros.</p>
    </div>
  )
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm run test -- src/features/groups/Thirds.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/groups/Thirds.tsx src/features/groups/Thirds.test.tsx
git commit -m "feat(terceros): grilla 2-col cableada con tope de 8 y estados"
```

---

## Task 5: `TeamPickerSheet` (lista de equipos con buscador)

**Files:**
- Create: `src/features/powerups/TeamPickerSheet.tsx`

> Cubierto por los tests de `Powerups` (Task 6). Sin test aislado.

- [ ] **Step 1: Crear `src/features/powerups/TeamPickerSheet.tsx`**

```tsx
import { useState } from 'react'
import { Check, MagnifyingGlass } from '@phosphor-icons/react'
import type { Team } from '../../types/api'
import { Sheet } from '../../ui/Sheet'
import { Flag } from '../../ui/Flag'

export function TeamPickerSheet({
  open,
  onClose,
  title,
  subtitle,
  teams,
  groupOf,
  selectedId,
  onPick,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  teams: Team[]
  groupOf: Record<string, string>
  selectedId: string
  onPick: (teamId: string) => void
}) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const filtered = needle ? teams.filter((t) => t.name.toLowerCase().includes(needle)) : teams

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="px-2 pb-1 text-xs text-ink-soft">{subtitle}</p>
      <div className="sticky top-0 z-10 bg-surface px-2 py-2">
        <div className="flex h-11 items-center gap-2 rounded-control border border-border px-3 focus-within:ring-2 focus-within:ring-violet">
          <MagnifyingGlass size={18} className="text-muted" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar equipo…"
            aria-label="Buscar equipo"
            className="h-full w-full bg-transparent text-[16px] focus:outline-none"
          />
        </div>
      </div>
      <ul className="flex flex-col gap-1.5 px-2 pb-2 pt-1">
        {filtered.map((t) => {
          const sel = t.id === selectedId
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={sel}
                onClick={() => onPick(t.id)}
                className={`flex w-full items-center gap-3 rounded-control border px-3 py-2.5 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet ${
                  sel ? 'border-violet bg-tint' : 'border-transparent hover:bg-surface-2'
                }`}
              >
                <Flag code={t.code} />
                <span className="flex-1">
                  <span className="block font-display text-sm font-bold text-ink">{t.name}</span>
                  <span className="block text-xs text-ink-soft">Grupo {groupOf[t.id]}</span>
                </span>
                <span
                  className={`grid size-5 place-items-center rounded-full border ${
                    sel ? 'border-violet bg-violet text-white' : 'border-border'
                  }`}
                  aria-hidden
                >
                  {sel && <Check size={13} weight="bold" />}
                </span>
              </button>
            </li>
          )
        })}
        {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Sin resultados</li>}
      </ul>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/powerups/TeamPickerSheet.tsx
git commit -m "feat(powerups): TeamPickerSheet (sheet con buscador single-select)"
```

---

## Task 6: Crear `Powerups` (rename de `PowerupsForm`)

**Files:**
- Create: `src/features/powerups/Powerups.tsx`
- Test: `src/features/powerups/Powerups.test.tsx`
- Delete: `src/features/powerups/PowerupsForm.tsx` (en la Task 7, tras actualizar el router)

Contexto de datos (seed): `notTop8` (caballo oscuro) = todos menos `tA1..tH1`; `top8` (decepción) = `tA1..tH1`. `p-luis` no tiene powerups (modo create); `p-juan` tiene `darkHorse tA4` + `disappointment tA1` (modo update). Nombres: `Equipo A2` (no top8), `Equipo A1` (top8).

- [ ] **Step 1: Escribir el test que falla**

```tsx
// src/features/powerups/Powerups.test.tsx
import { describe, it, expect } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'
import { db } from '../../mocks/db'
import { Powerups } from './Powerups'

describe('Powerups', () => {
  it('crea powerups eligiendo caballo oscuro y decepción (usuario sin powerups)', async () => {
    db.currentSessionId = 'p-luis' // sin powerups → modo create
    renderWithProviders(<Powerups />)

    await userEvent.click(await screen.findByRole('button', { name: /Caballo oscuro/i }))
    const dhSheet = await screen.findByRole('dialog', { name: 'Caballo oscuro' })
    await userEvent.click(within(dhSheet).getByRole('button', { name: /Equipo A2/i })) // A2 no es top8

    await userEvent.click(screen.getByRole('button', { name: /La decepción/i }))
    const disSheet = await screen.findByRole('dialog', { name: 'La decepción' })
    await userEvent.click(within(disSheet).getByRole('button', { name: /Equipo A1/i })) // A1 es top8

    const save = screen.getByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByText('Guardado')
  })

  it('habilita guardar de entrada cuando ya hay powerups (usuario con powerups)', async () => {
    db.currentSessionId = 'p-juan' // darkHorse tA4 + disappointment tA1 → modo update
    renderWithProviders(<Powerups />)
    const save = await screen.findByRole('button', { name: 'Guardar' })
    expect(save).toBeEnabled()
    await userEvent.click(save)
    await screen.findByText('Guardado')
  })
})
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm run test -- src/features/powerups/Powerups.test.tsx`
Expected: FAIL ("Failed to resolve import './Powerups'").

- [ ] **Step 3: Implementar `src/features/powerups/Powerups.tsx`**

```tsx
import { useState, type ReactNode } from 'react'
import { Horse, TrendDown } from '@phosphor-icons/react'
import type { Team } from '../../types/api'
import { useGroups } from '../groups/hooks'
import { usePowerups, useSavePowerups, useFriendsPowerups } from './hooks'
import { isApiError } from '../../lib/errors'
import { Button } from '../../ui/Button'
import { Flag } from '../../ui/Flag'
import { Confetti } from '../../ui/Confetti'
import { WizardFooter } from '../onboarding/WizardFooter'
import { TeamPickerSheet } from './TeamPickerSheet'

export function Powerups({ onComplete }: { onComplete?: () => void }) {
  const groups = useGroups()
  const mine = usePowerups()
  const friends = useFriendsPowerups()
  const wizard = !!onComplete
  const locked = friends.data?.available === true
  const hasPowerups = !!(mine.data?.darkHorse || mine.data?.disappointment)
  const save = useSavePowerups(hasPowerups ? 'update' : 'create')

  const [darkHorse, setDarkHorse] = useState<string | null>(null)
  const [disappointment, setDisappointment] = useState<string | null>(null)
  const [sheet, setSheet] = useState<null | 'dh' | 'dis'>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [done, setDone] = useState(false)

  if (groups.isLoading || mine.isLoading) return <PowerupsSkeleton wizard={wizard} />

  const list = groups.data?.data ?? []
  const teams = list.flatMap((g) => g.teams)
  const notTop8 = teams.filter((t) => !t.isTop8)
  const top8 = teams.filter((t) => t.isTop8)
  const groupOf: Record<string, string> = {}
  for (const g of list) for (const t of g.teams) groupOf[t.id] = g.label

  const dh = darkHorse ?? mine.data?.darkHorse?.teamId ?? ''
  const dis = disappointment ?? mine.data?.disappointment?.teamId ?? ''
  const dhTeam = teams.find((t) => t.id === dh) ?? null
  const disTeam = teams.find((t) => t.id === dis) ?? null
  const ready = !!dh && !!dis

  function onSave() {
    setError('')
    setSaved(false)
    save.mutate(
      { darkHorseTeamId: dh, disappointmentTeamId: dis },
      {
        onSuccess: () => {
          if (wizard) setDone(true)
          else setSaved(true)
        },
        onError: (e) => setError(isApiError(e) ? e.message : 'No se pudo guardar'),
      },
    )
  }

  if (done) return <PowerupsDone onHome={() => onComplete!()} />

  const cta = (
    <div>
      <Button fullWidth loading={save.isPending} disabled={!ready || locked} onClick={onSave}>
        {wizard ? 'Activar powerups' : 'Guardar'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="mt-2 text-center text-sm text-success">
          Guardado
        </p>
      )}
    </div>
  )

  return (
    <>
      {!wizard && (
        <header className="mb-5">
          <h1 className="font-display text-2xl font-extrabold text-ink">Tus powerups</h1>
          <p className="mt-1 text-ink-soft">Activa tu caballo oscuro y tu decepción del torneo.</p>
        </header>
      )}

      <div className="flex flex-col gap-3">
        <PowerupCard
          tone="dh"
          icon={<Horse size={22} weight="bold" />}
          title="Caballo oscuro"
          desc="Un equipo fuera del top 8. Suma puntos por cada ronda que avanza."
          team={dhTeam}
          groupLabel={dhTeam ? groupOf[dhTeam.id] : ''}
          hint="fuera del top 8"
          disabled={locked}
          onPick={() => setSheet('dh')}
        />
        <PowerupCard
          tone="dis"
          icon={<TrendDown size={22} weight="bold" />}
          title="La decepción"
          desc="Un equipo del top 8. Suma puntos por cada ronda en que cae antes."
          team={disTeam}
          groupLabel={disTeam ? groupOf[disTeam.id] : ''}
          hint="del top 8"
          disabled={locked}
          onPick={() => setSheet('dis')}
        />
      </div>

      {locked && (
        <p className="mt-3 text-center text-sm font-medium text-lock">
          Las predicciones están cerradas. Solo lectura.
        </p>
      )}

      {wizard ? <WizardFooter>{cta}</WizardFooter> : <div className="mt-6">{cta}</div>}

      <TeamPickerSheet
        open={sheet === 'dh'}
        onClose={() => setSheet(null)}
        title="Caballo oscuro"
        subtitle="Equipos fuera del top 8 · elige 1"
        teams={notTop8}
        groupOf={groupOf}
        selectedId={dh}
        onPick={(id) => {
          setDarkHorse(id)
          setSheet(null)
        }}
      />
      <TeamPickerSheet
        open={sheet === 'dis'}
        onClose={() => setSheet(null)}
        title="La decepción"
        subtitle="Equipos del top 8 · elige 1"
        teams={top8}
        groupOf={groupOf}
        selectedId={dis}
        onPick={(id) => {
          setDisappointment(id)
          setSheet(null)
        }}
      />
    </>
  )
}

function PowerupCard({
  tone,
  icon,
  title,
  desc,
  team,
  groupLabel,
  hint,
  disabled,
  onPick,
}: {
  tone: 'dh' | 'dis'
  icon: ReactNode
  title: string
  desc: string
  team: Team | null
  groupLabel: string
  hint: string
  disabled: boolean
  onPick: () => void
}) {
  const iconBg = tone === 'dh' ? 'bg-tint text-violet' : 'bg-[#fdeede] text-lock'
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="rounded-card border border-border bg-surface p-4 text-left shadow-card transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet disabled:opacity-60"
    >
      <span className={`mb-2.5 grid size-10 place-items-center rounded-xl ${iconBg}`}>{icon}</span>
      <span className="block font-display text-lg font-extrabold text-ink">{title}</span>
      <span className="mt-0.5 block text-sm text-ink-soft">{desc}</span>
      {team ? (
        <span className="mt-3 flex items-center gap-3 rounded-control border border-border bg-surface-2 p-2.5">
          <Flag code={team.code} />
          <span className="flex-1">
            <span className="block font-display text-sm font-bold text-ink">{team.name}</span>
            <span className="block text-xs text-ink-soft">
              Grupo {groupLabel} · {hint}
            </span>
          </span>
          <span className="font-display text-sm font-bold text-violet">Cambiar</span>
        </span>
      ) : (
        <span className="mt-3 block rounded-control border border-dashed border-border p-3 text-center text-sm font-semibold text-muted">
          Toca para elegir equipo
        </span>
      )}
    </button>
  )
}

function PowerupsDone({ onHome }: { onHome: () => void }) {
  return (
    <div className="relative grid place-items-center py-16 text-center">
      <Confetti />
      <h2 className="font-display text-2xl font-black text-ink">¡Tu polla está lista!</h2>
      <p className="mt-2 max-w-[34ch] text-ink-soft">
        Ya hiciste todas tus predicciones. Puedes editarlas hasta el cierre.
      </p>
      <Button className="mt-6" onClick={onHome}>
        Ir al inicio
      </Button>
    </div>
  )
}

function PowerupsSkeleton({ wizard }: { wizard: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${wizard ? '' : 'mt-2'}`}>
      <div className="h-40 animate-pulse rounded-card bg-surface-2" aria-busy />
      <div className="h-40 animate-pulse rounded-card bg-surface-2" aria-busy />
    </div>
  )
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm run test -- src/features/powerups/Powerups.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/powerups/Powerups.tsx src/features/powerups/TeamPickerSheet.tsx src/features/powerups/Powerups.test.tsx
git commit -m "feat(powerups): tarjetas temáticas + sheet de equipo y cierre con confeti"
```

---

## Task 7: Cablear el wizard y las rutas standalone

**Files:**
- Modify: `src/features/onboarding/OnboardingLayout.tsx`
- Modify: `src/app/router.tsx`
- Delete: `src/features/powerups/PowerupsForm.tsx`
- Delete: `src/features/onboarding/StepPlaceholder.tsx`

- [ ] **Step 1: Confirmar que `PowerupsForm` y `StepPlaceholder` solo se usan donde esperamos**

Run: `git grep -n "PowerupsForm\|StepPlaceholder" -- 'src/*'`
Expected: solo aparecen en `src/app/router.tsx` (import + elemento de `PowerupsForm`), en `src/features/powerups/PowerupsForm.tsx`, en `src/features/onboarding/OnboardingLayout.tsx` (import + usos de `StepPlaceholder`) y en `src/features/onboarding/StepPlaceholder.tsx`. Si aparece en otro sitio, ajusta ese import también en este task.

- [ ] **Step 2: Reescribir `src/features/onboarding/OnboardingLayout.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useOnboardingState, type StepKey } from './onboardingState'
import { SegmentedProgress } from '../../ui/SegmentedProgress'
import { Welcome } from './Welcome'
import { GroupDeck } from '../groups/GroupDeck'
import { Thirds } from '../groups/Thirds'
import { Powerups } from '../powerups/Powerups'

const ORDER: StepKey[] = ['groups', 'thirds', 'powerups']
const META: Record<StepKey, { kicker: string; title: string; help: string }> = {
  groups: {
    kicker: 'PASO 1 DE 3 · GRUPOS',
    title: 'Ordena cada grupo',
    help: 'Arrastra los equipos para ordenarlos del 1° al 4°, o usa las flechas.',
  },
  thirds: {
    kicker: 'PASO 2 DE 3 · TERCEROS',
    title: 'Mejores terceros',
    help: 'Elige los 8 mejores terceros entre todos los grupos.',
  },
  powerups: {
    kicker: 'PASO 3 DE 3 · POWERUPS',
    title: 'Tus powerups',
    help: 'Activa tu caballo oscuro y tu decepción del torneo.',
  },
}

export function OnboardingLayout() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const state = useOnboardingState()
  const [started, setStarted] = useState(false)

  const paso = params.get('paso') as StepKey | null
  const showWelcome = state.isFirstTime && !started && !paso
  const current: StepKey = paso ?? state.nextStepKey ?? 'groups'

  const segments = useMemo(
    () =>
      state.steps.map((s) => ({
        label: s.label.split(' ')[0],
        active: s.key === current,
        fill: Math.min(1, s.current / s.total),
      })),
    [state.steps, current],
  )

  function goStep(key: StepKey) {
    setParams({ paso: key })
  }
  function back() {
    const idx = ORDER.indexOf(current)
    if (idx > 0) goStep(ORDER[idx - 1])
    else nav('/')
  }

  if (showWelcome) return <Welcome onStart={() => setStarted(true)} />

  const meta = META[current]
  // Cada paso trae su propio CTA (footer fijo en Thirds/Powerups, navegación inline en Grupos):
  // no hay footer global. Solo reservamos espacio inferior para el footer fijo de los pasos 2 y 3.
  const hasFooter = current !== 'groups'
  return (
    <div className={`min-h-[100dvh] bg-bg ${hasFooter ? 'pb-[calc(96px+env(safe-area-inset-bottom))]' : 'pb-8'}`}>
      <div className="mx-auto max-w-[480px]">
        <header className="px-5 pt-[max(16px,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <button
              onClick={back}
              aria-label="Atrás"
              className="grid size-10 place-items-center rounded-full border border-border bg-surface active:scale-95"
            >
              <ArrowLeft size={20} weight="bold" />
            </button>
            <div className="flex-1">
              <SegmentedProgress segments={segments} />
            </div>
          </div>
          <p className="mt-5 font-mono text-xs font-bold tracking-wide text-violet">{meta.kicker}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-ink">{meta.title}</h1>
          <p className="mt-1 text-ink-soft">{meta.help}</p>
        </header>

        <div className="px-5 pt-6">
          {current === 'groups' && <GroupDeck onComplete={() => goStep('thirds')} />}
          {current === 'thirds' && <Thirds onComplete={() => goStep('powerups')} />}
          {current === 'powerups' && <Powerups onComplete={() => nav('/')} />}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Actualizar `src/app/router.tsx`**

Cambia el import (línea ~13):

```tsx
import { Powerups } from '../features/powerups/Powerups'
```

(elimina `import { PowerupsForm } from '../features/powerups/PowerupsForm'`)

Y el elemento de la ruta (línea ~50):

```tsx
      { path: 'predicciones/powerups', element: <Powerups /> },
```

- [ ] **Step 4: Borrar los archivos obsoletos**

```bash
git rm src/features/powerups/PowerupsForm.tsx src/features/onboarding/StepPlaceholder.tsx
```

- [ ] **Step 5: Verificar tipos, lint y toda la suite**

Run: `npx tsc -b --noEmit && npm run lint && npm run test`
Expected: PASS — `tsc` sin errores, `eslint` limpio (sin imports sin usar tras quitar el footer global), y todos los tests verdes (incluidos `onboardingState.test.ts`, `GroupDeck.test.tsx`, `Thirds.test.tsx`, `Powerups.test.tsx`, `Sheet.test.tsx` y los de handlers `groups.test.ts`/`powerups.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(onboarding): wizard renderiza Terceros y Powerups; rutas standalone reutilizan los componentes"
```

---

## Task 8: Verificación end-to-end y build

**Files:** ninguno (verificación).

- [ ] **Step 1: Build de producción**

Run: `npm run build`
Expected: PASS (`tsc -b` + `vite build` sin errores).

- [ ] **Step 2: Smoke en dev con mocks (manual)**

Run: `VITE_USE_MOCKS=true npm run dev` y en el navegador:
1. Login (dev-bypass o Google) → entra al wizard.
2. Grupos → completa los 12 → "Continuar a Terceros".
3. **Terceros:** grilla 2-col; el contador sube "n de 8"; al llegar a 8 las demás se atenúan; "Guardar y continuar" avanza a Powerups.
4. **Powerups:** toca "Caballo oscuro" → sheet con buscador (equipos fuera del top 8); elige uno; toca "La decepción" → sheet (top 8); elige uno; "Activar powerups".
5. **Cierre:** confeti + "¡Tu polla está lista!" + "Ir al inicio" → Dashboard al 100%.
6. Visita `/predicciones/terceros` y `/predicciones/powerups`: se ven los mismos componentes con CTA inline "Guardar" y confirmación "Guardado" (sin chocar con la nav inferior).
7. (Opcional) Con `prefers-reduced-motion` activado: el sheet aparece sin slide y no hay confeti.

Expected: el flujo completo funciona; cero errores en consola.

- [ ] **Step 3: Commit final (si hubo ajustes del smoke)**

```bash
git add -A
git commit -m "chore(onboarding): ajustes tras smoke de Terceros/Powerups"
```

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** §4.1 Terceros → Task 4; §4.2 Powerups + §4.4 Sheet + sheet picker → Tasks 2, 5, 6; §4.3 cierre confeti → Task 6 (`PowerupsDone`); §4.5 WizardFooter → Task 3; §3 modos wizard/standalone → Tasks 4, 6, 7; §2 estructura/rename/borrados → Tasks 1, 7; §6 pruebas → Tasks 2, 4, 6 + verificación Task 7/8; §5 motion/a11y → integrado (reduced-motion en Sheet/Confetti, `aria-pressed`, `aria-live`, foco, tap targets ≥48px vía `min-h-[52px]` del Button y celdas ≥ ~48px).
- **Sin placeholders:** todos los pasos con código muestran el código completo; comandos con salida esperada.
- **Consistencia de tipos:** `ThirdCandidate`/`Team`/`SaveThirdsBody`/`SavePowerupsBody` usados según `src/types/api.ts`; hooks `useThirds`/`useSaveThirds`/`useFriendsGroups`/`useGroups`/`usePowerups`/`useSavePowerups`/`useFriendsPowerups` con las firmas reales; `Flag`, `Sheet`, `WizardFooter`, `TeamPickerSheet`, `Powerups`, `Thirds` con props consistentes entre tareas.
