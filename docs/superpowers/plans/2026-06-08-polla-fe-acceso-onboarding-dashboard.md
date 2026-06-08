# Polla Mundial 2026 — Acceso, Onboarding y Dashboard (Entrega 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ponerle "piel" al flujo de entrada (Login navy, Signup, Welcome, armazón del paso a paso, baraja de Grupos tipo Tinder cableada, Dashboard) sobre la lógica ya existente, con un sistema de diseño reutilizable (Tailwind v4 + Framer Motion), mobile-first y accesible para personas mayores.

**Architecture:** SPA React 18 + Vite + TS. Se añade una base de diseño (`src/styles/` tokens + fuentes, `src/ui/` primitivas y capa de motion) y se reescriben/añaden pantallas en `src/features/` y `src/app/`. NO se tocan contratos, auth, hooks de dominio ni MSW. Los componentes de feature componen primitivas + hooks existentes. El estado del onboarding se **deriva** de los hooks de dominio (sin endpoints nuevos); el candado y el countdown se derivan de `useFriendsGroups()` (único contrato que expone `availableAt`/`available`).

**Tech Stack:** Tailwind CSS v4 (`@tailwindcss/vite`, config CSS-first con `@theme`), Framer Motion, @phosphor-icons/react, @fontsource (Outfit / Hanken Grotesk / JetBrains Mono), TanStack Query v5, React Router v6.

**Política de tests (spec §6.4 + CLAUDE.md del usuario):** estas pantallas son visuales. NO se hacen snapshots de estilo. Reglas:
1. **Cero regresiones:** los tests existentes deben seguir verdes. En particular preservar contratos: Login renderiza `<GoogleLogin>` y muestra `Redirigiendo…` en éxito / Signup en `USER_NOT_FOUND`; Signup usa labels `Código…`/`Teléfono…`, botón `Crear cuenta`, **un solo** `role="alert"` para validación E.164 y errores de servidor; Dashboard muestra `Hola, {nombre}`.
2. **Tests nuevos solo donde aportan:** `deriveOnboardingState` (derivación pura, TDD) y `GroupDeck` (guardar un grupo invalida `predictionsMe` → el contador sube 0→1).
3. Componentes puramente visuales se validan con `tsc`, `eslint` y `vite build` (no tests fabricados).

**Estilo de código (obligatorio, ver `.eslintrc.cjs` / `.prettierrc`):** sin punto y coma, comillas simples, `trailingComma: all`, `printWidth: 100`. `@typescript-eslint/no-unused-vars` es **error** (args que empiecen con `_` se ignoran). Comentarios escasos (solo lógica compleja). Tras cada tarea con código, el implementador puede correr `npm run format`.

---

## File Structure

**Nuevos:**
- `src/styles/theme.css` — `@import "tailwindcss"` + `@theme` con TODOS los tokens (color/fuente/radio/sombra) + capa base.
- `src/styles/fonts.css` — imports de `@fontsource`.
- `src/ui/motion.ts` — transiciones/variants compartidos + `useReduced()`.
- `src/ui/Button.tsx`, `Card.tsx`, `Chip.tsx`, `Avatar.tsx`, `Field.tsx` — primitivas.
- `src/ui/ProgressRing.tsx`, `SegmentedProgress.tsx`, `Stamp.tsx` — visuales de progreso/feedback.
- `src/ui/Backdrop.tsx` — fondo navy (aurora + grano), memoizado y reduced-motion-aware.
- `src/ui/Confetti.tsx` — burst WAAPI, no hace nada con `prefers-reduced-motion`.
- `src/app/BottomNav.tsx` — nav inferior dock-style con etiquetas.
- `src/features/onboarding/Welcome.tsx` — bienvenida navy (primer ingreso).
- `src/features/onboarding/OnboardingLayout.tsx` — armazón del wizard (header progreso + body por paso + footer fijo).
- `src/features/onboarding/onboardingState.ts` — `deriveOnboardingState` (pura) + `useOnboardingState()`.
- `src/features/onboarding/onboardingState.test.ts` — tests de la derivación.
- `src/features/onboarding/StepPlaceholder.tsx` — empty state de Terceros/Powerups (Entrega 3).
- `src/features/groups/GroupCard.tsx` — carta de un grupo (reorden drag + ↑/↓).
- `src/features/groups/GroupDeck.tsx` — baraja Tinder cableada a los hooks de grupos.
- `src/features/groups/GroupDeck.test.tsx` — guardar grupo invalida queries.

**Modificados:**
- `package.json` — nuevas dependencias (vía `npm install`).
- `vite.config.ts` — añadir `tailwindcss()` a `plugins`.
- `src/main.tsx` — importar `./styles/theme.css` y `./styles/fonts.css`.
- `index.html` — `theme-color` + `viewport-fit=cover`.
- `src/test/setup.ts` — polyfill de `window.matchMedia` (Framer `useReducedMotion`).
- `public/logo.png` — copia del `logo.png` raíz (servible en `/logo.png`).
- `src/app/AppShell.tsx` — reescrito (layout + `<BottomNav/>` + safe-areas).
- `src/app/router.tsx` — añadir ruta `/onboarding` (top-level, con `RequireAuth`).
- `src/features/onboarding/Login.tsx` — reescrito (navy).
- `src/features/onboarding/Signup.tsx` — reescrito (claro).
- `src/features/home/Dashboard.tsx` — reescrito (hero progreso + stepper + premios).

No se tocan: `GroupsList.tsx`, `GroupEditor.tsx`, `Thirds.tsx`, `PowerupsForm.tsx`, `Hub.tsx`, KO, scoreboard, admin, mocks, auth, lib.

---

## Task 1: Dependencias + wiring de Tailwind v4, fuentes y tokens

**Files:**
- Modify: `package.json` (vía npm)
- Modify: `vite.config.ts`
- Create: `src/styles/theme.css`
- Create: `src/styles/fonts.css`
- Modify: `src/main.tsx`
- Modify: `index.html`
- Create: `public/logo.png` (copia)

- [ ] **Step 1: Instalar dependencias**

Run:
```bash
npm install -D tailwindcss @tailwindcss/vite
npm install framer-motion @phosphor-icons/react
npm install @fontsource/outfit @fontsource/hanken-grotesk @fontsource/jetbrains-mono
```
Expected: `package.json` queda con `tailwindcss` + `@tailwindcss/vite` en devDependencies y el resto en dependencies; sin errores de peer deps.

- [ ] **Step 2: Copiar el logo a `public/` (servible en `/logo.png`)**

Run:
```bash
cp logo.png public/logo.png
```
Expected: `public/logo.png` existe.

- [ ] **Step 3: Añadir el plugin de Tailwind a Vite (sin tocar proxy ni Vitest)**

Editar `vite.config.ts` → import y plugin:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // D3: el API real se sirve same-origin bajo /api → cookie same-site sobre HTTP en dev
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
```

- [ ] **Step 4: Crear `src/styles/theme.css` con los tokens**

```css
@import 'tailwindcss';

@theme {
  --color-bg: #f5f4fa;
  --color-surface: #ffffff;
  --color-surface-2: #fbfafe;
  --color-ink: #1a1735;
  --color-ink-soft: #5c5878;
  --color-muted: #9a96b8;
  --color-border: #e7e4f2;
  --color-violet: #6d3bd6;
  --color-violet-strong: #5a28bf;
  --color-violet-light: #8b6dff;
  --color-tint: #eee8fd;
  --color-navy: #120f29;
  --color-navy-2: #1a1540;
  --color-success: #1c8a5b;
  --color-lock: #b45309;
  --color-danger: #c0362c;
  --color-gold: #b8862e;

  --font-display: 'Outfit', system-ui, sans-serif;
  --font-body: 'Hanken Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --radius-card: 20px;
  --radius-control: 14px;
  --radius-xl: 24px;
  --radius-2xl: 28px;

  --shadow-diffuse: 0 24px 50px -24px rgba(26, 21, 64, 0.45);
  --shadow-card: 0 10px 30px -18px rgba(26, 21, 64, 0.35);
}

@layer base {
  :root {
    color-scheme: light;
  }
  html {
    background: var(--color-bg);
    -webkit-text-size-adjust: 100%;
  }
  body {
    margin: 0;
    font-family: var(--font-body);
    color: var(--color-ink);
    background: var(--color-bg);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  h1,
  h2,
  h3 {
    font-family: var(--font-display);
  }
}
```
Nota: en Tailwind v4 estos tokens generan utilidades: `bg-violet`, `text-ink`, `border-border`, `bg-bg`, `font-display`, `font-mono`, `rounded-card`, `rounded-control`, `shadow-diffuse`, `shadow-card`, etc.

- [ ] **Step 5: Crear `src/styles/fonts.css`**

```css
@import '@fontsource/outfit/500.css';
@import '@fontsource/outfit/700.css';
@import '@fontsource/outfit/800.css';
@import '@fontsource/outfit/900.css';
@import '@fontsource/hanken-grotesk/400.css';
@import '@fontsource/hanken-grotesk/500.css';
@import '@fontsource/hanken-grotesk/600.css';
@import '@fontsource/hanken-grotesk/700.css';
@import '@fontsource/jetbrains-mono/600.css';
@import '@fontsource/jetbrains-mono/700.css';
```

- [ ] **Step 6: Importar los estilos en `main.tsx`**

Añadir al inicio de `src/main.tsx` (después de los imports de React, antes de `Providers`):
```ts
import './styles/fonts.css'
import './styles/theme.css'
```
El resto de `main.tsx` queda igual.

- [ ] **Step 7: `index.html` — safe areas + theme-color**

Reemplazar el `<meta name="viewport">` y añadir `theme-color`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#120f29" />
```

- [ ] **Step 8: Verificar build y que los tests siguen verdes**

Run: `npx tsc -b && npm run test`
Expected: `tsc` sin errores; toda la suite existente en verde (las nuevas deps no rompen nada; `css:false` ignora los `@import` en tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(design): base de diseño — Tailwind v4 + tokens + fuentes self-host"
```

---

## Task 2: Polyfill de `matchMedia` en el setup de tests

Framer Motion (`useReducedMotion`) llama `window.matchMedia`, que jsdom no implementa → crashea cualquier test que monte un componente con motion. Hay que polyfillarlo antes de montar.

**Files:**
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Añadir el polyfill**

Editar `src/test/setup.ts` — añadir tras los imports, antes de los hooks:
```ts
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
```

- [ ] **Step 2: Verificar**

Run: `npm run test`
Expected: suite existente sigue verde (el polyfill es inerte para los tests actuales).

- [ ] **Step 3: Commit**

```bash
git add src/test/setup.ts
git commit -m "test: polyfill de matchMedia para Framer Motion en jsdom"
```

---

## Task 3: Capa de motion compartida (`src/ui/motion.ts`)

**Files:**
- Create: `src/ui/motion.ts`

- [ ] **Step 1: Crear `motion.ts`**

```ts
import { useReducedMotion, type Transition, type Variants } from 'framer-motion'

export const spring: Transition = { type: 'spring', stiffness: 120, damping: 18 }
export const springSoft: Transition = { type: 'spring', stiffness: 90, damping: 16 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring },
}

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: spring },
}

export function useReduced(): boolean {
  return useReducedMotion() ?? false
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/ui/motion.ts
git commit -m "feat(ui): capa de motion compartida (variants + useReduced)"
```

---

## Task 4: Primitivas estáticas (Button, Card, Chip, Avatar)

**Files:**
- Create: `src/ui/Button.tsx`, `src/ui/Card.tsx`, `src/ui/Chip.tsx`, `src/ui/Avatar.tsx`

- [ ] **Step 1: `Button.tsx`**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'light' | 'glass'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  fullWidth?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 font-display font-semibold rounded-control ' +
  'min-h-[52px] px-5 text-[16px] transition active:scale-[0.98] disabled:opacity-60 ' +
  'disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-violet focus-visible:ring-offset-2'

const variants: Record<Variant, string> = {
  primary: 'bg-violet text-white shadow-card hover:bg-violet-strong',
  ghost: 'bg-transparent text-ink-soft hover:text-ink',
  light: 'bg-white text-ink border border-border hover:bg-surface-2',
  glass:
    'bg-white/10 text-white border border-white/20 backdrop-blur-md ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-white/15',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', loading = false, fullWidth = false, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading && (
        <span
          className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden
        />
      )}
      {children}
    </button>
  )
})
```

- [ ] **Step 2: `Card.tsx`**

```tsx
import { type HTMLAttributes } from 'react'

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-surface rounded-card border border-border shadow-card ${className}`} {...rest} />
}
```

- [ ] **Step 3: `Chip.tsx`**

```tsx
import { type ReactNode } from 'react'

type Tone = 'neutral' | 'violet' | 'success' | 'lock' | 'gold'

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-soft border-border',
  violet: 'bg-tint text-violet-strong border-transparent',
  success: 'bg-[#e6f4ee] text-success border-transparent',
  lock: 'bg-[#fbefd9] text-lock border-transparent',
  gold: 'bg-[#f6eed9] text-gold border-transparent',
}

export function Chip({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[13px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
```

- [ ] **Step 4: `Avatar.tsx`**

```tsx
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-display font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: 'linear-gradient(135deg, #6d3bd6, #8b6dff)',
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}
```

- [ ] **Step 5: Verificar tipos/lint**

Run: `npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/ui/Button.tsx src/ui/Card.tsx src/ui/Chip.tsx src/ui/Avatar.tsx
git commit -m "feat(ui): primitivas Button, Card, Chip, Avatar"
```

---

## Task 5: Field (input con label/helper/error)

**Files:**
- Create: `src/ui/Field.tsx`

- [ ] **Step 1: `Field.tsx`**

```tsx
import { forwardRef, useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helper?: string
  error?: string
}

export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, helper, error, id, className = '', ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = error ? `${inputId}-err` : helper ? `${inputId}-help` : undefined
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="font-display font-semibold text-[15px] text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-[52px] rounded-control border bg-surface px-4 text-[16px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-violet focus:border-violet ${
          error ? 'border-danger' : 'border-border'
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-err`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : helper ? (
        <p id={`${inputId}-help`} className="text-[13px] text-ink-soft">
          {helper}
        </p>
      ) : null}
    </div>
  )
})
```
Nota: `text-[16px]` evita el zoom automático de iOS. En Signup (Task 11) NO se usa el prop `error` (los errores van a un único `role="alert"` superior, para preservar los tests).

- [ ] **Step 2: Verificar**

Run: `npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/ui/Field.tsx
git commit -m "feat(ui): Field (label/helper/error accesible)"
```

---

## Task 6: Progreso (ProgressRing + SegmentedProgress) y Stamp

**Files:**
- Create: `src/ui/ProgressRing.tsx`, `src/ui/SegmentedProgress.tsx`, `src/ui/Stamp.tsx`

- [ ] **Step 1: `ProgressRing.tsx`** (anillo que se dibuja + count-up; reduced-motion → estático)

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import { useReduced } from './motion'

export function ProgressRing({
  percent,
  size = 160,
  stroke = 14,
  children,
}: {
  percent: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const reduced = useReduced()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const [shown, setShown] = useState(reduced ? percent : 0)

  useEffect(() => {
    if (reduced) {
      setShown(percent)
      return
    }
    let raf = 0
    const start = performance.now()
    const dur = 900
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(percent * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [percent, reduced])

  const offset = c - (shown / 100) * c
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-violet-light)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {children ?? <span className="font-mono text-3xl font-bold">{shown}%</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `SegmentedProgress.tsx`** (header del wizard: 3 segmentos)

```tsx
export interface Segment {
  label: string
  fill: number // 0..1
  active: boolean
}

export function SegmentedProgress({ segments }: { segments: Segment[] }) {
  return (
    <div className="flex gap-2">
      {segments.map((s, i) => (
        <div key={i} className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-violet transition-[width] duration-500"
              style={{ width: `${Math.round(s.fill * 100)}%` }}
            />
          </div>
          <span className={`mt-1 block text-[11px] font-medium ${s.active ? 'text-violet' : 'text-muted'}`}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: `Stamp.tsx`** (sellos LISTO/VOLVER de la baraja)

```tsx
export function Stamp({ kind }: { kind: 'listo' | 'volver' }) {
  const isListo = kind === 'listo'
  return (
    <span
      className={`pointer-events-none select-none rounded-xl border-4 px-4 py-2 font-display text-2xl font-extrabold uppercase tracking-wide ${
        isListo ? 'rotate-[-12deg] border-success text-success' : 'rotate-[12deg] border-lock text-lock'
      }`}
    >
      {isListo ? 'Listo' : 'Volver'}
    </span>
  )
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/ui/ProgressRing.tsx src/ui/SegmentedProgress.tsx src/ui/Stamp.tsx
git commit -m "feat(ui): ProgressRing (anillo animado), SegmentedProgress y Stamp"
```

---

## Task 7: Backdrop (aurora navy + grano) y Confetti

**Files:**
- Create: `src/ui/Backdrop.tsx`, `src/ui/Confetti.tsx`

- [ ] **Step 1: `Backdrop.tsx`** (memoizado; sin loops con reduced-motion)

```tsx
import { memo } from 'react'
import { motion } from 'framer-motion'
import { useReduced } from './motion'

export const NavyBackdrop = memo(function NavyBackdrop() {
  const reduced = useReduced()
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy" aria-hidden>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 50% -10%, #1a1540 0%, #120f29 60%)' }}
      />
      {!reduced && (
        <>
          <motion.div
            className="absolute -top-1/4 left-1/2 size-[70vmax] -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(139,109,255,0.35), transparent 60%)' }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.8, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/3 -right-1/4 size-[55vmax] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(109,59,214,0.3), transparent 60%)' }}
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.65, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}
      <svg className="absolute inset-0 size-full opacity-[0.06] mix-blend-overlay" aria-hidden>
        <filter id="grain-navy">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-navy)" />
      </svg>
    </div>
  )
})
```

- [ ] **Step 2: `Confetti.tsx`** (WAAPI determinista; reduced-motion o sin WAAPI → no hace nada)

```tsx
import { useEffect, useRef } from 'react'
import { useReduced } from './motion'

const COLORS = ['#6d3bd6', '#8b6dff', '#b8862e', '#1c8a5b', '#eee8fd']

export function Confetti({ count = 80 }: { count?: number }) {
  const reduced = useReduced()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current
    if (reduced || !host) return
    const pieces: HTMLSpanElement[] = []
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span')
      const w = 6 + (i % 5)
      s.style.cssText = `position:absolute;top:40%;left:50%;width:${w}px;height:${
        w * 0.5
      }px;background:${COLORS[i % COLORS.length]};border-radius:1px;will-change:transform,opacity`
      host.appendChild(s)
      pieces.push(s)
      if (typeof s.animate !== 'function') continue
      const angle = (i / count) * Math.PI * 2
      const dist = 120 + (i % 7) * 28
      const dx = Math.cos(angle) * dist
      const dy = Math.sin(angle) * dist - 140
      s.animate(
        [
          { transform: 'translate(-50%,-50%) rotate(0deg)', opacity: 1 },
          { transform: `translate(${dx}px,${dy + 260}px) rotate(${360 + i * 12}deg)`, opacity: 0 },
        ],
        { duration: 1100 + (i % 6) * 120, easing: 'cubic-bezier(.2,.6,.2,1)', fill: 'forwards' },
      )
    }
    const t = setTimeout(() => pieces.forEach((p) => p.remove()), 2400)
    return () => {
      clearTimeout(t)
      pieces.forEach((p) => p.remove())
    }
  }, [count, reduced])
  return <div ref={ref} className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden />
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/ui/Backdrop.tsx src/ui/Confetti.tsx
git commit -m "feat(ui): NavyBackdrop (aurora+grano) y Confetti accesibles"
```

---

## Task 8: App Shell + Bottom Nav

**Files:**
- Modify: `src/app/AppShell.tsx`
- Create: `src/app/BottomNav.tsx`

- [ ] **Step 1: `BottomNav.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { House, ListChecks, Trophy, Shield } from '@phosphor-icons/react'
import { useAuth } from '../auth/useAuth'

const items = [
  { to: '/', label: 'Inicio', Icon: House, end: true },
  { to: '/onboarding', label: 'Predicciones', Icon: ListChecks, end: false },
  { to: '/tabla', label: 'Tabla', Icon: Trophy, end: false },
]

export function BottomNav() {
  const { participant } = useAuth()
  const all =
    participant?.role === 'admin'
      ? [...items, { to: '/admin', label: 'Admin', Icon: Shield, end: false }]
      : items
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around px-2">
        {all.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
                isActive ? 'text-violet' : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={24} weight={isActive ? 'fill' : 'regular'} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Reescribir `AppShell.tsx`**

```tsx
import { type ReactNode } from 'react'
import { BottomNav } from './BottomNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-bg">
      <main className="mx-auto w-full max-w-[480px] px-5 pb-[calc(88px+env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 3: Verificar (tipos + suite; el router aún usa AppShell igual)**

Run: `npx tsc -b && npm run test`
Expected: sin errores; suite verde.

- [ ] **Step 4: Commit**

```bash
git add src/app/AppShell.tsx src/app/BottomNav.tsx
git commit -m "feat(app): AppShell mobile-first + BottomNav con etiquetas"
```

---

## Task 9: Login (navy "Noche de marca") — preservando contratos de test

**Files:**
- Modify: `src/features/onboarding/Login.tsx`
- Test (existente, debe seguir verde): `src/features/onboarding/Login.test.tsx`

- [ ] **Step 1: Reescribir `Login.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import { useLogin } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'
import { env } from '../../lib/env'
import { NavyBackdrop } from '../../ui/Backdrop'
import { fadeUp, stagger } from '../../ui/motion'
import { Signup } from './Signup'
import { DevLoginPanel } from './DevLoginPanel'

export function Login() {
  const navigate = useNavigate()
  const login = useLogin()
  const [credential, setCredential] = useState<string | null>(null)
  const [showSignup, setShowSignup] = useState(false)
  const [message, setMessage] = useState('')

  function onSuccess(resp: { credential?: string }) {
    if (!resp.credential) return
    setCredential(resp.credential)
    setMessage('')
    login.mutate(resp.credential, {
      onSuccess: () => navigate('/'),
      onError: (e) => {
        if (isApiError(e) && e.code === 'USER_NOT_FOUND') setShowSignup(true)
        else setMessage(isApiError(e) ? e.message : 'Error al iniciar sesión')
      },
    })
  }

  if (login.isSuccess) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-navy text-white">
        <p className="font-display text-lg">Redirigiendo…</p>
      </div>
    )
  }
  if (showSignup && credential) {
    return (
      <Signup
        credential={credential}
        onNeedRelogin={() => {
          setShowSignup(false)
          setCredential(null)
          setMessage('Tu sesión de Google expiró, inicia de nuevo.')
        }}
      />
    )
  }

  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-6 text-white">
      <NavyBackdrop />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 flex w-full max-w-sm flex-col items-center text-center"
      >
        <motion.div variants={fadeUp} className="relative mb-8">
          <div className="absolute inset-0 -z-10 rounded-[28px] bg-violet-light/30 blur-2xl" />
          <img src="/logo.png" alt="Polla Mundial 2026" width={92} height={92} className="rounded-[26px] shadow-diffuse" />
        </motion.div>

        <motion.h1 variants={fadeUp} className="font-display text-4xl font-black leading-none tracking-tight">
          POLLA
          <br />
          <span className="text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.85)]">MUNDIAL</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-3 text-violet-light/90">
          2026 · Entre amigos
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 w-full">
          <div className="flex justify-center">
            <GoogleLogin onSuccess={onSuccess} onError={() => setMessage('No se pudo iniciar con Google')} />
          </div>
          {login.isPending && <p className="mt-3 text-sm text-violet-light">Entrando…</p>}
          {message && (
            <p role="alert" className="mt-3 text-sm text-[#ffb4ae]">
              {message}
            </p>
          )}
        </motion.div>

        <motion.p variants={fadeUp} className="mt-8 text-xs text-white/60">
          Solo por invitación ·{' '}
          <button type="button" className="underline underline-offset-2">
            ¿Cómo funciona?
          </button>
        </motion.p>
      </motion.div>

      {import.meta.env.DEV && env.useMocks && (
        <div className="relative z-10 mt-6 w-full max-w-sm text-white/80">
          <DevLoginPanel />
        </div>
      )}
    </div>
  )
}
```
Contratos preservados: `<GoogleLogin>` (el test lo mockea por un botón "Google"), `onSuccess`/`onError` intactos, `login.isSuccess` → "Redirigiendo…", `USER_NOT_FOUND` → `<Signup>`, `role="alert"` para errores, `DevLoginPanel` en dev+mocks.

- [ ] **Step 2: Verificar el test de Login (y toda la suite)**

Run: `npm run test -- src/features/onboarding/Login.test.tsx`
Expected: PASS (usuario existente → "Redirigiendo…"; usuario nuevo → labels `código`/`teléfono`).

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/Login.tsx
git commit -m "feat(onboarding): Login navy 'Noche de marca'"
```

---

## Task 10: Signup (claro) — preservando contratos de test

**Files:**
- Modify: `src/features/onboarding/Signup.tsx`
- Test (existente, debe seguir verde): `src/features/onboarding/Signup.test.tsx`

- [ ] **Step 1: Reescribir `Signup.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSignup } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'
import { Field } from '../../ui/Field'
import { Button } from '../../ui/Button'
import { fadeUp, stagger } from '../../ui/motion'

const E164 = /^\+[1-9]\d{7,14}$/

export function Signup({ credential, onNeedRelogin }: { credential: string; onNeedRelogin: () => void }) {
  const navigate = useNavigate()
  const signup = useSignup()
  const [code, setCode] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    if (!code.trim()) return setMessage('Ingresa el código de invitación')
    if (!E164.test(phone)) return setMessage('Formato inválido. Usa E.164 ej: +573001234567')
    signup.mutate(
      { credential, code: code.trim(), phone },
      {
        onSuccess: () => navigate('/'),
        onError: (err) => {
          if (isApiError(err) && err.code === 'INVALID_GOOGLE_TOKEN') onNeedRelogin()
          else setMessage(isApiError(err) ? err.message : 'No se pudo crear la cuenta')
        },
      },
    )
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-sm flex-col justify-center px-6 py-10">
      <motion.form
        variants={stagger}
        initial="hidden"
        animate="show"
        onSubmit={onSubmit}
        className="flex flex-col gap-6"
      >
        <motion.div variants={fadeUp}>
          <h1 className="font-display text-2xl font-extrabold text-ink">Ya casi estás dentro</h1>
          <p className="mt-1 text-ink-soft">Confirma tu invitación y tu WhatsApp para crear tu cuenta.</p>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field
            label="Código de invitación"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
            placeholder="Ej: MUNDIAL26"
            helper="Te lo compartió quien te invitó."
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Field
            label="Teléfono (WhatsApp)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="+573001234567"
            helper="Formato internacional, con +57."
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Button type="submit" fullWidth loading={signup.isPending}>
            Crear cuenta
          </Button>
          {message && (
            <p role="alert" className="mt-3 text-center text-sm text-danger">
              {message}
            </p>
          )}
        </motion.div>
      </motion.form>
    </div>
  )
}
```
Contratos preservados: labels `Código de invitación`/`Teléfono (WhatsApp)` (matchean `/código/i` y `/teléfono/i`), botón `Crear cuenta`, validación E.164 → único `role="alert"`, error de servidor → mismo alert (texto `/no encontrado/i` viene del mock), `INVALID_GOOGLE_TOKEN` → `onNeedRelogin`. Los `Field` NO usan el prop `error` (un solo alert en pantalla).

- [ ] **Step 2: Verificar el test de Signup**

Run: `npm run test -- src/features/onboarding/Signup.test.tsx`
Expected: PASS (E.164 → alert; código inexistente → "no encontrado"; credential expirado → onNeedRelogin).

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/Signup.tsx
git commit -m "feat(onboarding): Signup claro con Field/Button"
```

---

## Task 11: Estado del onboarding (`onboardingState.ts`) — TDD de la derivación

**Files:**
- Create: `src/features/onboarding/onboardingState.ts`
- Test: `src/features/onboarding/onboardingState.test.ts`

- [ ] **Step 1: Escribir el test que falla (derivación pura)**

`src/features/onboarding/onboardingState.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { deriveOnboardingState } from './onboardingState'

const base = {
  completedGroups: 0,
  thirdsCount: 0,
  groupsDone: false,
  hasDarkHorse: false,
  hasDisappointment: false,
  locked: false,
  closesAt: null,
  loading: false,
}

describe('deriveOnboardingState', () => {
  it('primera vez: todo en cero, 0%, siguiente paso = grupos', () => {
    const s = deriveOnboardingState(base)
    expect(s.isFirstTime).toBe(true)
    expect(s.percent).toBe(0)
    expect(s.nextStepKey).toBe('groups')
    expect(s.steps[1].status).toBe('disabled') // terceros bloqueado sin 12 grupos
  })

  it('grupos a medias: in_progress y porcentaje proporcional', () => {
    const s = deriveOnboardingState({ ...base, completedGroups: 6 })
    expect(s.steps[0].status).toBe('in_progress')
    expect(s.isFirstTime).toBe(false)
    expect(s.percent).toBe(17) // round(((6/12 + 0 + 0)/3)*100)
  })

  it('grupos completos habilitan terceros y avanzan el siguiente paso', () => {
    const s = deriveOnboardingState({ ...base, completedGroups: 12, groupsDone: true })
    expect(s.steps[0].status).toBe('done')
    expect(s.steps[1].status).toBe('pending')
    expect(s.nextStepKey).toBe('thirds')
  })

  it('todo completo: isComplete true, 100%, sin siguiente paso', () => {
    const s = deriveOnboardingState({
      ...base,
      completedGroups: 12,
      groupsDone: true,
      thirdsCount: 8,
      hasDarkHorse: true,
      hasDisappointment: true,
    })
    expect(s.isComplete).toBe(true)
    expect(s.percent).toBe(100)
    expect(s.nextStepKey).toBe(null)
  })

  it('propaga locked y closesAt', () => {
    const s = deriveOnboardingState({ ...base, locked: true, closesAt: '2026-06-11T16:00:00.000Z' })
    expect(s.locked).toBe(true)
    expect(s.closesAt).toBe('2026-06-11T16:00:00.000Z')
  })
})
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `npm run test -- src/features/onboarding/onboardingState.test.ts`
Expected: FAIL ("deriveOnboardingState is not a function" / módulo inexistente).

- [ ] **Step 3: Implementar `onboardingState.ts`**

```ts
import { useMyGroupPredictions, useThirds, useFriendsGroups } from '../groups/hooks'
import { usePowerups } from '../powerups/hooks'

export type StepKey = 'groups' | 'thirds' | 'powerups'
export type StepStatus = 'done' | 'in_progress' | 'pending' | 'disabled'

export interface OnboardingStep {
  key: StepKey
  label: string
  status: StepStatus
  current: number
  total: number
  detail: string
}

export interface OnboardingState {
  steps: OnboardingStep[]
  percent: number
  nextStepKey: StepKey | null
  isFirstTime: boolean
  isComplete: boolean
  locked: boolean
  closesAt: string | null
  loading: boolean
}

interface DeriveInput {
  completedGroups: number
  thirdsCount: number
  groupsDone: boolean
  hasDarkHorse: boolean
  hasDisappointment: boolean
  locked: boolean
  closesAt: string | null
  loading: boolean
}

export function deriveOnboardingState(i: DeriveInput): OnboardingState {
  const powerupsCount = (i.hasDarkHorse ? 1 : 0) + (i.hasDisappointment ? 1 : 0)

  const groups: OnboardingStep = {
    key: 'groups',
    label: 'Grupos',
    current: i.completedGroups,
    total: 12,
    detail: `${i.completedGroups} de 12 grupos`,
    status: i.completedGroups >= 12 ? 'done' : i.completedGroups > 0 ? 'in_progress' : 'pending',
  }
  const thirds: OnboardingStep = {
    key: 'thirds',
    label: 'Mejores terceros',
    current: i.thirdsCount,
    total: 8,
    detail: i.groupsDone ? `${i.thirdsCount} de 8 terceros` : 'Disponible al terminar los grupos',
    status: !i.groupsDone ? 'disabled' : i.thirdsCount >= 8 ? 'done' : i.thirdsCount > 0 ? 'in_progress' : 'pending',
  }
  const powerups: OnboardingStep = {
    key: 'powerups',
    label: 'Powerups',
    current: powerupsCount,
    total: 2,
    detail: `${powerupsCount} de 2 elegidos`,
    status: powerupsCount >= 2 ? 'done' : powerupsCount > 0 ? 'in_progress' : 'pending',
  }

  const steps = [groups, thirds, powerups]
  const fracs = [i.completedGroups / 12, i.thirdsCount / 8, powerupsCount / 2]
  const percent = Math.round((fracs.reduce((a, b) => a + b, 0) / 3) * 100)
  const nextStepKey = steps.find((s) => s.status === 'in_progress' || s.status === 'pending')?.key ?? null
  const isComplete = steps.every((s) => s.status === 'done')
  const isFirstTime = i.completedGroups === 0 && i.thirdsCount === 0 && powerupsCount === 0

  return { steps, percent, nextStepKey, isFirstTime, isComplete, locked: i.locked, closesAt: i.closesAt, loading: i.loading }
}

export function useOnboardingState(): OnboardingState {
  const groups = useMyGroupPredictions()
  const thirds = useThirds()
  const powerups = usePowerups()
  const friends = useFriendsGroups()
  const completedGroups = groups.data?.completedGroups ?? 0
  return deriveOnboardingState({
    completedGroups,
    thirdsCount: thirds.data?.selectedCount ?? 0,
    groupsDone: completedGroups >= 12,
    hasDarkHorse: !!powerups.data?.darkHorse,
    hasDisappointment: !!powerups.data?.disappointment,
    locked: friends.data?.available === true,
    closesAt: friends.data?.available === false ? friends.data.availableAt ?? null : null,
    loading: groups.isLoading || thirds.isLoading || powerups.isLoading,
  })
}
```
Nota de diseño: el candado/cierre se derivan de `useFriendsGroups()` — `available:false` ⇒ predicciones abiertas y `availableAt` = fecha de cierre (countdown); `available:true` ⇒ torneo iniciado ⇒ bloqueado. Es el único contrato que expone esa fecha sin endpoint nuevo.

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `npm run test -- src/features/onboarding/onboardingState.test.ts`
Expected: PASS (5 casos).

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/onboardingState.ts src/features/onboarding/onboardingState.test.ts
git commit -m "feat(onboarding): derivación de estado/progreso desde hooks de dominio (TDD)"
```

---

## Task 12: Welcome (navy, primer ingreso)

**Files:**
- Create: `src/features/onboarding/Welcome.tsx`

- [ ] **Step 1: `Welcome.tsx`**

```tsx
import { motion } from 'framer-motion'
import { useAuth } from '../../auth/useAuth'
import { NavyBackdrop } from '../../ui/Backdrop'
import { Confetti } from '../../ui/Confetti'
import { Button } from '../../ui/Button'
import { fadeUp, stagger } from '../../ui/motion'

const STEPS = ['Ordena los 12 grupos', 'Elige los 8 mejores terceros', 'Activa tus 2 powerups']

export function Welcome({ onStart }: { onStart: () => void }) {
  const { participant } = useAuth()
  const first = participant?.name?.split(' ')[0] ?? ''
  return (
    <div className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-6 text-white">
      <NavyBackdrop />
      <Confetti />
      <motion.div variants={stagger} initial="hidden" animate="show" className="relative z-10 w-full max-w-sm text-center">
        <motion.h1 variants={fadeUp} className="font-display text-3xl font-black">
          ¡Estás dentro{first ? `, ${first}` : ''}!
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-2 text-violet-light/90">
          Arma tu polla en 3 pasos. Te guiamos en cada uno.
        </motion.p>
        <motion.ul variants={stagger} className="mt-8 space-y-3 text-left">
          {STEPS.map((s, i) => (
            <motion.li
              key={s}
              variants={fadeUp}
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet font-mono font-bold">
                {i + 1}
              </span>
              <span className="text-[15px]">{s}</span>
            </motion.li>
          ))}
        </motion.ul>
        <motion.div variants={fadeUp} className="mt-10">
          <Button variant="light" fullWidth onClick={onStart}>
            Empezar
          </Button>
          <button type="button" className="mt-4 text-sm text-white/70 underline underline-offset-2">
            ¿Cómo se juega?
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/onboarding/Welcome.tsx
git commit -m "feat(onboarding): Welcome navy con celebración"
```

---

## Task 13: GroupCard (carta de un grupo: reorden drag + ↑/↓)

**Files:**
- Create: `src/features/groups/GroupCard.tsx`

- [ ] **Step 1: `GroupCard.tsx`**

```tsx
import { Reorder } from 'framer-motion'
import { ArrowUp, ArrowDown } from '@phosphor-icons/react'
import type { Team } from '../../types/api'

export function GroupCard({
  groupName,
  teams,
  order,
  onReorder,
  readOnly = false,
}: {
  groupName: string
  teams: Team[]
  order: string[]
  onReorder: (next: string[]) => void
  readOnly?: boolean
}) {
  const byId = (id: string) => teams.find((t) => t.id === id)

  function move(id: string, dir: -1 | 1) {
    const i = order.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    onReorder(next)
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <h2 className="font-display text-xl font-extrabold text-ink">{groupName}</h2>
      <p className="mt-1 text-sm text-ink-soft">Ordena del 1° al 4°.</p>
      <Reorder.Group axis="y" values={order} onReorder={onReorder} className="mt-4 space-y-2.5">
        {order.map((id, idx) => {
          const t = byId(id)
          if (!t) return null
          const top = idx < 2
          return (
            <Reorder.Item
              key={id}
              value={id}
              dragListener={!readOnly}
              className={`flex items-center gap-3 rounded-control border bg-surface px-3 py-3 ${
                top ? 'border-violet/40 bg-tint/40' : 'border-border'
              }`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${
                  top ? 'bg-violet text-white' : 'bg-surface-2 text-ink-soft'
                }`}
              >
                {idx + 1}
              </span>
              <Flag code={t.code} />
              <span className="flex-1 font-medium text-ink">{t.name}</span>
              {!readOnly && (
                <span className="flex flex-col">
                  <button
                    aria-label={`Subir ${t.name}`}
                    onClick={() => move(id, -1)}
                    disabled={idx === 0}
                    className="p-1 text-muted active:scale-90 disabled:opacity-30"
                  >
                    <ArrowUp size={16} weight="bold" />
                  </button>
                  <button
                    aria-label={`Bajar ${t.name}`}
                    onClick={() => move(id, 1)}
                    disabled={idx === order.length - 1}
                    className="p-1 text-muted active:scale-90 disabled:opacity-30"
                  >
                    <ArrowDown size={16} weight="bold" />
                  </button>
                </span>
              )}
            </Reorder.Item>
          )
        })}
      </Reorder.Group>
    </div>
  )
}

function Flag({ code }: { code: string }) {
  const hueA = (code.charCodeAt(0) * 47) % 360
  const hueB = (code.charCodeAt(Math.min(1, code.length - 1)) * 83) % 360
  return (
    <span
      className="size-7 shrink-0 overflow-hidden rounded-md border border-border"
      aria-hidden
      style={{ background: `linear-gradient(135deg, hsl(${hueA} 60% 55%), hsl(${hueB} 60% 45%))` }}
    />
  )
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/features/groups/GroupCard.tsx
git commit -m "feat(groups): GroupCard con reorden (drag + ↑/↓ accesibles)"
```

---

## Task 14: GroupDeck (baraja Tinder cableada) — con test de guardado→invalidación

**Files:**
- Create: `src/features/groups/GroupDeck.tsx`
- Test: `src/features/groups/GroupDeck.test.tsx`

- [ ] **Step 1: Implementar `GroupDeck.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { useGroups, useMyGroupPredictions, useSaveGroupPredictions, useFriendsGroups } from './hooks'
import { isApiError } from '../../lib/errors'
import { Button } from '../../ui/Button'
import { Stamp } from '../../ui/Stamp'
import { Confetti } from '../../ui/Confetti'
import { useReduced } from '../../ui/motion'
import { GroupCard } from './GroupCard'

const SWIPE = 90

export function GroupDeck({ onComplete }: { onComplete?: () => void }) {
  const groups = useGroups()
  const mine = useMyGroupPredictions()
  const save = useSaveGroupPredictions()
  const friends = useFriendsGroups()
  const reduced = useReduced()
  const locked = friends.data?.available === true

  const [index, setIndex] = useState(0)
  const [orders, setOrders] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const listoOpacity = useTransform(x, [40, 140], [0, 1])
  const volverOpacity = useTransform(x, [-140, -40], [1, 0])

  const list = groups.data?.data ?? []
  const completed = mine.data?.completedGroups ?? 0
  const current = list[index]

  const effectiveOrder = useMemo(() => {
    if (!current) return []
    if (orders[current.id]) return orders[current.id]
    const existing = mine.data?.data.find((g) => g.groupId === current.id)
    return existing && existing.rankings.length === 4
      ? existing.rankings.map((r) => r.teamId)
      : current.teams.map((t) => t.id)
  }, [current, orders, mine.data])

  if (groups.isLoading || mine.isLoading) return <DeckSkeleton />
  if (groups.isError) return <DeckError onRetry={() => groups.refetch()} />
  if (!current) return null

  function setOrder(next: string[]) {
    setOrders((o) => ({ ...o, [current.id]: next }))
  }
  function goTo(i: number) {
    x.set(0)
    setIndex(Math.max(0, Math.min(list.length - 1, i)))
  }
  function confirm(dir: 1 | -1) {
    setMessage('')
    if (dir === -1) {
      goTo(index - 1)
      return
    }
    save.mutate(
      {
        predictions: [
          { groupId: current.id, rankings: effectiveOrder.map((teamId, i) => ({ teamId, position: i + 1 })) },
        ],
      },
      {
        onSuccess: () => {
          if (index >= list.length - 1) {
            setDone(true)
            onComplete?.()
          } else {
            goTo(index + 1)
          }
        },
        onError: (e) => setMessage(isApiError(e) ? e.message : 'No se pudo guardar'),
      },
    )
  }

  if (done) {
    return (
      <div className="relative grid place-items-center py-16 text-center">
        <Confetti />
        <h2 className="font-display text-2xl font-black text-ink">¡12 grupos listos!</h2>
        <p className="mt-2 text-ink-soft">Ahora elige tus mejores terceros.</p>
        <Button className="mt-6" onClick={() => onComplete?.()}>
          Continuar a Terceros
        </Button>
      </div>
    )
  }

  return (
    <div className="select-none">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-sm font-bold text-ink">{completed} de 12 listos</p>
        <DeckDots total={list.length} index={index} onPick={goTo} />
      </div>

      <div className="relative h-[460px]">
        {list[index + 1] && !reduced && (
          <div
            className="absolute inset-x-3 top-3 -z-10 h-full scale-[0.97] rounded-2xl border border-border bg-surface-2 opacity-70"
            aria-hidden
          />
        )}
        <AnimatePresence initial={false}>
          <motion.div
            key={current.id}
            style={reduced ? undefined : { x, rotate }}
            drag={locked || reduced ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x > SWIPE) confirm(1)
              else if (info.offset.x < -SWIPE) confirm(-1)
              else x.set(0)
            }}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <GroupCard
              groupName={current.name}
              teams={current.teams}
              order={effectiveOrder}
              onReorder={setOrder}
              readOnly={locked}
            />
            {!reduced && (
              <>
                <motion.div style={{ opacity: listoOpacity }} className="absolute right-5 top-5">
                  <Stamp kind="listo" />
                </motion.div>
                <motion.div style={{ opacity: volverOpacity }} className="absolute left-5 top-5">
                  <Stamp kind="volver" />
                </motion.div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {locked && (
        <p className="mt-3 text-center text-sm font-medium text-lock">
          Las predicciones están cerradas. Solo lectura.
        </p>
      )}
      {message && (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          {message}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button variant="light" onClick={() => confirm(-1)} disabled={index === 0}>
          Anterior
        </Button>
        <Button className="flex-1" loading={save.isPending} disabled={locked} onClick={() => confirm(1)}>
          {index >= list.length - 1 ? 'Guardar y terminar' : 'Listo, siguiente'}
        </Button>
      </div>
    </div>
  )
}

function DeckDots({ total, index, onPick }: { total: number; index: number; onPick: (i: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          aria-label={`Ir al grupo ${i + 1}`}
          onClick={() => onPick(i)}
          className={`size-2 rounded-full ${i === index ? 'bg-violet' : 'bg-border'}`}
        />
      ))}
    </div>
  )
}

function DeckSkeleton() {
  return <div className="h-[460px] animate-pulse rounded-2xl bg-surface-2" aria-busy />
}

function DeckError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <p className="text-ink-soft">No pudimos cargar los grupos.</p>
      <Button className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Escribir el test (guardar grupo invalida `predictionsMe`)**

`src/features/groups/GroupDeck.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { renderWithProviders } from '../../test/utils'
import { makeFakeIdToken } from '../../mocks/jwt'
import { makeQueryClient } from '../../lib/queryClient'
import { useLogin } from '../../auth/hooks'
import { GroupDeck } from './GroupDeck'

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => null,
}))

function loginAsJuan() {
  const qc = makeQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return renderHook(() => useLogin(), { wrapper })
}

beforeEach(() => {})

describe('GroupDeck', () => {
  it('guardar un grupo sube el contador (invalida predictionsMe)', async () => {
    const { result } = loginAsJuan()
    result.current.mutate(makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    renderWithProviders(<GroupDeck />)

    expect(await screen.findByText(/0 de 12 listos/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /listo, siguiente/i }))
    expect(await screen.findByText(/1 de 12 listos/i)).toBeInTheDocument()
  })
})
```
Nota: confirmar la primera carta con el orden por defecto (4 equipos, posiciones 1–4) es un ranking válido → el mock lo guarda → `groupComplete` ⇒ `completedGroups` pasa a 1; la invalidación refetchea `predictionsMe` y el contador sube 0→1. El swipe no se usa en jsdom; el botón es la alternativa accesible.

- [ ] **Step 3: Correr el test**

Run: `npm run test -- src/features/groups/GroupDeck.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/groups/GroupDeck.tsx src/features/groups/GroupDeck.test.tsx
git commit -m "feat(groups): baraja Tinder cableada (swipe + botones, guarda e invalida)"
```

---

## Task 15: StepPlaceholder + OnboardingLayout (armazón del wizard)

**Files:**
- Create: `src/features/onboarding/StepPlaceholder.tsx`
- Create: `src/features/onboarding/OnboardingLayout.tsx`

- [ ] **Step 1: `StepPlaceholder.tsx`** (empty state Terceros/Powerups — Entrega 3)

```tsx
import { LockSimple, Sparkle } from '@phosphor-icons/react'
import { Card } from '../../ui/Card'

export function StepPlaceholder({ kind, enabled = true }: { kind: 'thirds' | 'powerups'; enabled?: boolean }) {
  const copy =
    kind === 'thirds'
      ? {
          t: 'Mejores terceros',
          d: 'Cuando termines los 12 grupos, aquí eliges los 8 terceros que crees que clasifican.',
        }
      : { t: 'Powerups', d: 'Elige tu caballo oscuro y tu decepción del torneo para sumar puntos extra.' }
  return (
    <Card className="flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-tint text-violet">
        {kind === 'thirds' ? <LockSimple size={28} weight="bold" /> : <Sparkle size={28} weight="bold" />}
      </span>
      <h2 className="font-display text-lg font-bold text-ink">{copy.t}</h2>
      <p className="max-w-[34ch] text-ink-soft">{copy.d}</p>
      {!enabled && <p className="text-sm font-medium text-lock">Disponible al completar los grupos</p>}
      <p className="mt-2 text-sm text-muted">Próximamente en esta versión</p>
    </Card>
  )
}
```

- [ ] **Step 2: `OnboardingLayout.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { useOnboardingState, type StepKey } from './onboardingState'
import { SegmentedProgress } from '../../ui/SegmentedProgress'
import { Button } from '../../ui/Button'
import { Welcome } from './Welcome'
import { StepPlaceholder } from './StepPlaceholder'
import { GroupDeck } from '../groups/GroupDeck'

const ORDER: StepKey[] = ['groups', 'thirds', 'powerups']
const META: Record<StepKey, { kicker: string; title: string; help: string }> = {
  groups: {
    kicker: 'PASO 1 DE 3 · GRUPOS',
    title: 'Ordena cada grupo',
    help: 'Arrastra los equipos del 1° al 4°. Desliza la carta para pasar al siguiente grupo.',
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
  function next() {
    const idx = ORDER.indexOf(current)
    if (idx < ORDER.length - 1) goStep(ORDER[idx + 1])
    else nav('/')
  }

  if (showWelcome) return <Welcome onStart={() => setStarted(true)} />

  const meta = META[current]
  return (
    <div className="min-h-[100dvh] bg-bg pb-[calc(96px+env(safe-area-inset-bottom))]">
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
          {current === 'thirds' && <StepPlaceholder kind="thirds" enabled={state.steps[1].status !== 'disabled'} />}
          {current === 'powerups' && <StepPlaceholder kind="powerups" />}
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-5 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-[480px] items-center gap-3">
          <Button variant="ghost" onClick={() => nav('/')}>
            Guardar y salir
          </Button>
          <Button className="flex-1" onClick={next}>
            {current === 'powerups' ? 'Finalizar' : 'Siguiente paso'}
          </Button>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc -b && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/features/onboarding/StepPlaceholder.tsx src/features/onboarding/OnboardingLayout.tsx
git commit -m "feat(onboarding): armazón del wizard (progreso + pasos + footer)"
```

---

## Task 16: Dashboard (hero progreso + stepper + premios) — preservando "Hola, {nombre}"

**Files:**
- Modify: `src/features/home/Dashboard.tsx`
- Test (existente, debe seguir verde): `src/features/home/Dashboard.test.tsx`

- [ ] **Step 1: Reescribir `Dashboard.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SignOut, CaretRight, Check } from '@phosphor-icons/react'
import { useAuth } from '../../auth/useAuth'
import { useLogout } from '../../auth/hooks'
import { useOnboardingState, type StepKey, type StepStatus } from '../onboarding/onboardingState'
import { Avatar } from '../../ui/Avatar'
import { Card } from '../../ui/Card'
import { Chip } from '../../ui/Chip'
import { Button } from '../../ui/Button'
import { ProgressRing } from '../../ui/ProgressRing'
import { NavyBackdrop } from '../../ui/Backdrop'
import { fadeUp, stagger } from '../../ui/motion'

export function Dashboard() {
  const { participant } = useAuth()
  const logout = useLogout()
  const nav = useNavigate()
  const state = useOnboardingState()
  const [menu, setMenu] = useState(false)
  const name = participant?.name ?? '…'

  const days = state.closesAt ? daysUntil(state.closesAt) : null
  const heroTitle = state.isComplete ? '¡Polla completa!' : state.isFirstTime ? 'Arma tu polla' : 'Casi lista'
  const heroSub = state.locked
    ? 'Predicciones cerradas. ¡Suerte!'
    : state.isComplete
      ? 'Listo. Puedes ajustar hasta el cierre.'
      : nextLabel(state.nextStepKey)

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">
      <motion.header variants={fadeUp} className="flex items-center justify-between pt-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-ink">Hola, {name}</h1>
          <p className="text-sm text-ink-soft">
            {state.locked
              ? 'El Mundial ya arrancó'
              : days != null
                ? `Faltan ${days} días para el cierre`
                : 'Antes de que arranque el Mundial'}
          </p>
        </div>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-label="Tu cuenta" className="active:scale-95">
            <Avatar name={name} />
          </button>
          {menu && (
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-border bg-surface p-1 shadow-diffuse">
              <button
                onClick={() => logout.mutate(undefined, { onSuccess: () => nav('/login') })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-ink hover:bg-surface-2"
              >
                <SignOut size={18} weight="bold" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </motion.header>

      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden rounded-2xl p-6 text-white">
          <NavyBackdrop />
          <div className="relative z-10 flex items-center gap-5">
            <ProgressRing percent={state.percent} size={132} stroke={12} />
            <div className="flex-1">
              <p className="font-mono text-xs font-bold tracking-wide text-violet-light">TU POLLA</p>
              <h2 className="mt-1 font-display text-2xl font-black">{heroTitle}</h2>
              <p className="mt-1 text-sm text-white/80">{heroSub}</p>
            </div>
          </div>
          {!state.locked && !state.isComplete && (
            <Button
              variant="light"
              fullWidth
              className="relative z-10 mt-5"
              onClick={() => nav(state.nextStepKey ? `/onboarding?paso=${state.nextStepKey}` : '/onboarding')}
            >
              Continuar donde quedé
            </Button>
          )}
        </div>
      </motion.div>

      <motion.section variants={fadeUp}>
        <h3 className="mb-2 px-1 font-display font-bold text-ink">Completa tu polla</h3>
        <Card className="divide-y divide-border">
          {state.steps.map((s) => (
            <button
              key={s.key}
              onClick={() => nav(`/onboarding?paso=${s.key}`)}
              disabled={s.status === 'disabled'}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:opacity-50"
            >
              <StepIcon status={s.status} />
              <span className="flex-1">
                <span className="block font-medium text-ink">{s.label}</span>
                <span className="block text-sm text-ink-soft">{s.detail}</span>
              </span>
              <StepBadge status={s.status} />
              <CaretRight size={18} className="text-muted" />
            </button>
          ))}
        </Card>
      </motion.section>

      <motion.section variants={fadeUp}>
        <Card className="flex items-center gap-4 border-gold/30 bg-[#f8f2e4] p-5">
          <span className="grid size-12 place-items-center rounded-2xl bg-gold/15 font-display text-2xl font-black text-gold">
            $
          </span>
          <div className="flex-1">
            <p className="font-display font-bold text-ink">Bolsa $1.000.000</p>
            <p className="font-mono text-sm text-ink-soft">1° 700k · 2° 250k · 3° 50k</p>
          </div>
        </Card>
      </motion.section>
    </motion.div>
  )
}

function nextLabel(key: StepKey | null): string {
  if (key === 'groups') return 'Sigue: ordena los grupos'
  if (key === 'thirds') return 'Sigue: elige los terceros'
  if (key === 'powerups') return 'Sigue: activa tus powerups'
  return 'Todo en orden'
}

function daysUntil(iso: string): number {
  const ms = Date.parse(iso) - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

function StepIcon({ status }: { status: StepStatus }) {
  const done = status === 'done'
  return (
    <span
      className={`grid size-9 place-items-center rounded-xl ${
        done ? 'bg-success/15 text-success' : 'bg-tint text-violet'
      }`}
    >
      {done ? <Check size={18} weight="bold" /> : <span className="size-2.5 rounded-full bg-current" />}
    </span>
  )
}

function StepBadge({ status }: { status: StepStatus }) {
  if (status === 'done') return <Chip tone="success">Completo</Chip>
  if (status === 'in_progress') return <Chip tone="violet">En curso</Chip>
  if (status === 'disabled') return <Chip tone="lock">Bloqueado</Chip>
  return <Chip tone="neutral">Pendiente</Chip>
}
```
Contrato preservado: `<h1>Hola, {name}</h1>` (matchea `/hola, juan/i`); no se persiste storage. Las queries extra (grupos/terceros/powerups/friends) están todas cubiertas por MSW en tests.

- [ ] **Step 2: Verificar el test del Dashboard**

Run: `npm run test -- src/features/home/Dashboard.test.tsx`
Expected: PASS (muestra "Hola, Juan"; no persiste storage).

- [ ] **Step 3: Commit**

```bash
git add src/features/home/Dashboard.tsx
git commit -m "feat(home): Dashboard con hero de progreso, stepper en vivo y premios"
```

---

## Task 17: Routing — ruta `/onboarding` (top-level con guard)

**Files:**
- Modify: `src/app/router.tsx`

- [ ] **Step 1: Añadir import y ruta**

En `src/app/router.tsx`:
1. Añadir el import:
```tsx
import { OnboardingLayout } from '../features/onboarding/OnboardingLayout'
```
2. Añadir la ruta top-level (hermana de `/login`, antes del bloque `path: '/'`), envuelta en `RequireAuth` para que el wizard ocupe toda la pantalla sin la `BottomNav`:
```tsx
  { path: '/login', element: <Login /> },
  { path: '/onboarding', element: <RequireAuth><OnboardingLayout /></RequireAuth> },
```
El resto del árbol de rutas queda igual. (`RequireAuth` ya está importado en el archivo.)

- [ ] **Step 2: Verificar build/tipos/suite completa**

Run: `npx tsc -b && npm run test`
Expected: sin errores; toda la suite verde.

- [ ] **Step 3: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(app): ruta /onboarding (wizard a pantalla completa con guard)"
```

---

## Task 18: Verificación final integral

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Tipos + lint + tests + build**

Run:
```bash
npx tsc -b && npm run lint && npm run test && npm run build
```
Expected: todo verde; `vite build` genera `dist/` sin errores (incluye el procesado real de Tailwind/fuentes, que en tests está desactivado).

- [ ] **Step 2: Humo manual (mocks) — checklist del criterio de éxito (spec §7)**

Run: `VITE_USE_MOCKS=true npm run dev` y verificar en el navegador a ~390px:
1. `/login` muestra el mundo navy (aurora + logo + Google). Con `DevLoginPanel`, entrar como un inscrito.
2. Primer ingreso → `/onboarding` muestra `Welcome` (confeti) → "Empezar".
3. Paso 1 = baraja de grupos: reordenar (drag y ↑/↓), "Listo, siguiente" guarda y avanza; el contador "N de 12 listos" sube; al grupo 12 → cierre con confeti.
4. Pasos 2 y 3 muestran el empty state (Terceros bloqueado hasta completar grupos).
5. `/` (Dashboard) muestra "Hola, {nombre}", anillo con el % real derivado, stepper en vivo, "Continuar donde quedé" salta al paso pendiente, nav inferior (Inicio/Predicciones/Tabla[/Admin]).
6. Con `prefers-reduced-motion` activado en el SO: sin loops/parallax/confeti, transiciones cortas; los botones siguen operando todo (gesto opcional).
7. Reloj simulado "Torneo iniciado" (DevLoginPanel) → la baraja entra en solo-lectura y el Dashboard muestra estado bloqueado.

- [ ] **Step 3: Commit final (si hubo ajustes del humo)**

```bash
git add -A
git commit -m "chore(design): ajustes finales del flujo de acceso/onboarding/dashboard"
```

---

## Self-Review (cobertura del spec)

- **§1 Dirección visual / paleta / tipografía / forma:** Task 1 (tokens `@theme` + fuentes self-host) + primitivas Tasks 3–7. ✔
- **§2 Motion (espectáculo + reduced-motion):** `motion.ts`, `NavyBackdrop`, `Confetti`, `ProgressRing`, baraja con drag/`Reorder` — todos con `useReduced()`. ✔
- **§3 Stack/deps/estructura:** Task 1 (deps + Vite + `main.tsx`), estructura `src/styles` + `src/ui`. ✔
- **§4.1 Login navy:** Task 9 (preserva contratos). ✔
- **§4.2 Signup claro:** Task 10 (preserva contratos). ✔
- **§4.3 Welcome:** Task 12; "primera vez" derivado en `onboardingState`. ✔
- **§4.4 Armazón wizard:** Task 15 (header progreso, body por paso, footer fijo, atrás, candado read-only). ✔
- **§4.5 onboardingState:** Task 11 (derivación sin endpoints; lock/closesAt vía `useFriendsGroups`). ✔
- **§4.6 Baraja Tinder:** Tasks 13–14 (drag + reorden + sellos + dots + guardado/invalidación + `PREDICTIONS_LOCKED`/`INVALID_RANKINGS` inline + cierre con confeti + accesibilidad por botones). ✔
- **§4.7 Dashboard:** Task 16 (hero navy + anillo + stepper en vivo + premios + nav + estados; countdown desde `closesAt`). ✔
- **§4.8 App Shell + Nav:** Task 8. ✔
- **§5 Accesibilidad mayores:** tap targets ≥52px (Button/Field `min-h-[52px]`, nav `min-h-[56px]`), inputs 16px (anti-zoom iOS), labels visibles, foco violeta, `role="alert"`, gestos con alternativa, reduced-motion. ✔
- **§6 Decisiones:** Tailwind v4 (Task 1), corte Grupos cableado / Terceros+Powerups empty (Tasks 14–15), fuentes self-host (Task 1), tests donde aportan (Tasks 11,14) sin romper los existentes (Tasks 9,10,16). ✔
- **§7 Criterios de éxito:** Task 18. ✔

**Consistencia de tipos:** `StepKey`/`StepStatus`/`OnboardingStep`/`OnboardingState` definidos en Task 11 y consumidos idénticos en Tasks 15–16. `Team` importado de `types/api`. `Segment` de `SegmentedProgress` consumido en `OnboardingLayout`. `Button`/`Card`/`Chip`/`Field`/`Avatar`/`ProgressRing`/`Stamp`/`Confetti`/`NavyBackdrop` con firmas estables entre tareas. Hooks de dominio usados con su forma real (`useMyGroupPredictions().data.completedGroups`, `useSaveGroupPredictions().mutate({predictions:[{groupId,rankings:[{teamId,position}]}]})`, `useFriendsGroups().data.{available,availableAt}`).

**Sin placeholders:** todas las tareas con código incluyen el código completo y comandos con salida esperada.
