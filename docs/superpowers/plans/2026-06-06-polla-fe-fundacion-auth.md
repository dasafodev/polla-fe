# Fundación + Auth — Implementation Plan (Fase A, parte 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar la base técnica del frontend lista y el flujo de autenticación (login/signup atómico/logout/rehidratación) funcionando end-to-end sobre mocks, con tests.

**Architecture:** SPA React+Vite+TS organizada por features. La capa de datos (tipos a mano + `apiClient` con `credentials:'include'` + TanStack Query) se ejercita contra **MSW con estado en memoria**. La sesión es por cookie HttpOnly (simulada en el mock con un puntero `currentSessionId`); el front nunca lee la cookie: rehidrata con `GET /me`. Sin estilos: HTML crudo.

**Tech Stack:** React 18, Vite, TypeScript (strict), React Router v6, TanStack Query v5, `@react-oauth/google`, MSW v2, Vitest + React Testing Library.

**Spec de referencia:** `docs/superpowers/specs/2026-06-06-polla-fe-frontend-architecture-design.md` (este plan cubre §0.1 Fase A en lo relativo a fundación + auth: §3, §4, §5, §6, §7, §9.1–9.5 auth, §10, §11 infra de test).

**Convenciones del mock (clave para auth):** el `credential` de Google es un JWT; en mock/test usamos un JWT falso `header.<payloadBase64url>.sig` cuyo payload es `{ sub, email, name, exp? }`. El handler decodifica el payload (no verifica firma). `exp` (epoch segundos) permite simular token expirado. La identidad es `sub` (= `google_sub`).

---

## Estructura de archivos (esta entrega)

```
package.json, vite.config.ts, tsconfig.json, tsconfig.node.json, .eslintrc.cjs, .prettierrc, .env.example, index.html
public/mockServiceWorker.js            # generado por `npx msw init`
src/
  main.tsx                             # bootstrap + arranque condicional de MSW
  vite-env.d.ts
  test/setup.ts                        # jest-dom, server MSW, resetDb, reset clock
  test/utils.tsx                       # renderWithProviders, makeFakeIdToken
  lib/ env.ts errors.ts apiClient.ts queryClient.ts clock.ts
  types/ enums.ts api.ts
  auth/ google.ts AuthContext.tsx useAuth.ts hooks.ts
  app/ providers.tsx ErrorBoundary.tsx AppShell.tsx router.tsx guards/RequireAuth.tsx guards/RequireAdmin.tsx
  features/onboarding/ Login.tsx Signup.tsx
  features/home/ Dashboard.tsx
  mocks/ db.ts seed.ts jwt.ts browser.ts server.ts handlers/index.ts handlers/auth.ts devApi.ts
```

---

## Task 1: Andamiaje Vite + React + TS y dependencias

**Files:**
- Create: `package.json`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "polla-fe",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@react-oauth/google": "^0.12.1",
    "@tanstack/react-query": "^5.51.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.18.0",
    "@typescript-eslint/parser": "^7.18.0",
    "@vitejs/plugin-react": "^4.3.1",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.9",
    "jsdom": "^24.1.1",
    "msw": "^2.3.5",
    "prettier": "^3.3.3",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Crear `index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Polla Mundial 2026</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Crear `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 4: Crear `src/main.tsx` (placeholder; se completa en Task 17)**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

async function enableMocks() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'warn' })
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div>Polla 2026 — bootstrap</div>
    </StrictMode>,
  )
})
```

- [ ] **Step 5: Instalar dependencias**

Run: `npm install`
Expected: instala sin errores; crea `node_modules` y `package-lock.json`.

- [ ] **Step 6: Commit**

```bash
printf "node_modules\ndist\n*.local\n.env\n" > .gitignore
git add package.json package-lock.json index.html src/main.tsx src/vite-env.d.ts .gitignore
git commit -m "chore: andamiaje vite+react+ts y dependencias"
```

---

## Task 2: Configuración (TS strict, Vite + proxy, Vitest, ESLint/Prettier)

**Files:**
- Create: `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `.eslintrc.cjs`, `.prettierrc`

- [ ] **Step 1: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 2: Crear `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 3: Crear `vite.config.ts` (incluye proxy same-origin D3 y config de Vitest)**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
```

- [ ] **Step 4: Crear `.eslintrc.cjs`**

```cjs
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  ignorePatterns: ['dist', 'node_modules', 'public/mockServiceWorker.js'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
}
```

- [ ] **Step 5: Crear `.prettierrc`**

```json
{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 6: Crear `src/test/setup.ts` mínimo (Task 12 lo expande con MSW + reset)**

`vite.config.ts` ya referencia este archivo en `setupFiles`, así que debe existir antes de correr cualquier test (Task 6 en adelante).

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 7: Verificar typecheck**

Run: `npx tsc -b`
Expected: termina sin errores (no hay código aún que falle).

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json tsconfig.node.json vite.config.ts .eslintrc.cjs .prettierrc src/test/setup.ts
git commit -m "chore: config de typescript strict, vite+proxy, vitest, eslint/prettier"
```

---

## Task 3: Lectura tipada de entorno (`lib/env.ts`) y `.env.example`

**Files:**
- Create: `src/lib/env.ts`, `.env.example`

- [ ] **Step 1: Crear `.env.example`**

```
VITE_USE_MOCKS=true
VITE_API_BASE_URL=/api
VITE_GOOGLE_CLIENT_ID=replace-with-oauth-client-id
```

- [ ] **Step 2: Crear `src/lib/env.ts`**

```ts
export const env = {
  useMocks: import.meta.env.VITE_USE_MOCKS === 'true',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api',
  googleClientId: (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '',
  isDev: import.meta.env.DEV,
}
```

- [ ] **Step 3: Crear `.env` local para desarrollo**

```bash
cp .env.example .env
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/env.ts .env.example
git commit -m "feat: lectura tipada de variables de entorno"
```

---

## Task 4: Enums y catálogo de códigos (`types/enums.ts`)

**Files:**
- Create: `src/types/enums.ts`

- [ ] **Step 1: Crear `src/types/enums.ts`**

```ts
// Slugs de ronda KO (contrato)
export const ROUND_SLUGS = ['r32', 'r16', 'qf', 'sf', '3rd', 'final'] as const
export type RoundSlug = (typeof ROUND_SLUGS)[number]

// Estado de partido KO (contrato)
export type MatchStatus = 'scheduled' | 'live' | 'finished'

// Rol del participante (contrato)
export type Role = 'participant' | 'admin'

// Catálogo exhaustivo de códigos de error (§10 del spec)
export const ERROR_CODES = [
  'UNAUTHORIZED', 'FORBIDDEN', 'VALIDATION_ERROR', 'INVALID_GOOGLE_TOKEN',
  'INVITE_NOT_FOUND', 'INVITE_ALREADY_USED', 'INVITE_EXPIRED',
  'USER_NOT_FOUND', 'USER_ALREADY_EXISTS',
  'INVALID_PHONE', 'PHONE_ALREADY_EXISTS',
  'PREDICTIONS_LOCKED', 'INVALID_RANKINGS', 'INVALID_THIRD_CANDIDATE', 'INVALID_THIRDS_COUNT',
  'INVALID_DARK_HORSE', 'INVALID_DISAPPOINTMENT', 'POWERUPS_ALREADY_EXISTS', 'POWERUPS_NOT_FOUND',
  'MATCH_LOCKED', 'MATCH_FINISHED', 'INVALID_TEAM_ADVANCES', 'TRIPLE_USES_EXHAUSTED',
  'PREDICTION_ALREADY_EXISTS', 'PREDICTION_NOT_FOUND',
  'MATCH_NOT_FOUND', 'ROUND_NOT_FOUND', 'PARAM_NOT_FOUND', 'GROUPS_ALREADY_LOADED',
  'PARTICIPANT_NOT_FOUND', 'NETWORK_ERROR',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/types/enums.ts
git commit -m "feat: enums y catalogo de codigos de error"
```

---

## Task 5: Tipos del contrato — auth y compartidos (`types/api.ts`)

**Files:**
- Create: `src/types/api.ts`

- [ ] **Step 1: Crear `src/types/api.ts` (subset de auth + compartidos; crecerá en planes siguientes)**

```ts
import type { Role } from './enums'

// schema ParticipantMe — FORMA NUEVA (§5.1): sin hasJoined/hasPhone
export interface ParticipantMe {
  id: string
  name: string
  email: string
  role: Role
}

// schema ErrorResponse
export interface ErrorResponse {
  error: string
  code: string
}

// schema HealthResponse
export interface HealthResponse {
  status: string
  db: string
  timestamp: string
}

// schema Invitation
export interface Invitation {
  id: string
  code: string
  status: 'available' | 'used'
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

// Bodies de auth (modelo nuevo §7)
export interface LoginBody {
  credential: string
}
export interface SignupBody {
  credential: string
  code: string
  phone: string
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/types/api.ts
git commit -m "feat: tipos del contrato (auth y compartidos)"
```

---

## Task 6: `ApiError` y helpers (`lib/errors.ts`) — TDD

**Files:**
- Create: `src/lib/errors.ts`
- Test: `src/lib/errors.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from 'vitest'
import { ApiError, isApiError } from './errors'

describe('ApiError', () => {
  it('guarda code, message y status', () => {
    const e = new ApiError('UNAUTHORIZED', 'No autorizado', 401)
    expect(e.code).toBe('UNAUTHORIZED')
    expect(e.message).toBe('No autorizado')
    expect(e.status).toBe(401)
    expect(e).toBeInstanceOf(Error)
  })

  it('isApiError discrimina', () => {
    expect(isApiError(new ApiError('NETWORK_ERROR', 'x', 0))).toBe(true)
    expect(isApiError(new Error('plain'))).toBe(false)
    expect(isApiError(null)).toBe(false)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/errors.test.ts`
Expected: FAIL — `errors` no exporta `ApiError`.

- [ ] **Step 3: Implementar `src/lib/errors.ts`**

```ts
import type { ErrorCode } from '../types/enums'

export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export function isCode(e: unknown, code: ErrorCode): boolean {
  return isApiError(e) && e.code === code
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/errors.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/errors.ts src/lib/errors.test.ts
git commit -m "feat: ApiError y helpers de error"
```

---

## Task 7: Cliente HTTP (`lib/apiClient.ts`) — TDD

El cliente NO hace routing ni toca el QueryClient (§5.2). Solo mapea errores a `ApiError`, incluyendo `NETWORK_ERROR` ante fallo de red / respuesta no-JSON / timeout.

**Files:**
- Create: `src/lib/apiClient.ts`
- Test: `src/lib/apiClient.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { request } from './apiClient'
import { ApiError } from './errors'

function mockFetch(impl: typeof fetch) {
  vi.stubGlobal('fetch', impl)
}
afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('devuelve JSON parseado en 2xx', async () => {
    mockFetch(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await expect(request('GET', '/x')).resolves.toEqual({ ok: true })
  })

  it('envía credentials include y serializa el body', async () => {
    const spy = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.credentials).toBe('include')
      expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
      expect(init.body).toBe(JSON.stringify({ a: 1 }))
      return new Response('{}', { status: 200 })
    })
    mockFetch(spy as unknown as typeof fetch)
    await request('POST', '/x', { body: { a: 1 } })
    expect(spy).toHaveBeenCalledOnce()
  })

  it('lanza ApiError con code/status del ErrorResponse en no-2xx', async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: 'No autorizado', code: 'UNAUTHORIZED' }), { status: 401 }))
    await expect(request('GET', '/x')).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
  })

  it('normaliza fallo de red a NETWORK_ERROR', async () => {
    mockFetch(async () => { throw new TypeError('Failed to fetch') })
    await expect(request('GET', '/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 })
  })

  it('normaliza respuesta no-JSON en error a NETWORK_ERROR', async () => {
    mockFetch(async () => new Response('<html>502</html>', { status: 502 }))
    const err = await request('GET', '/x').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).code).toBe('NETWORK_ERROR')
  })

  it('204 resuelve a undefined', async () => {
    mockFetch(async () => new Response(null, { status: 204 }))
    await expect(request('POST', '/logout')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/apiClient.test.ts`
Expected: FAIL — `apiClient` no exporta `request`.

- [ ] **Step 3: Implementar `src/lib/apiClient.ts`**

```ts
import { env } from './env'
import { ApiError } from './errors'

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
interface Options {
  body?: unknown
  query?: Record<string, string | number | undefined>
  signal?: AbortSignal
  timeoutMs?: number
}

function buildUrl(path: string, query?: Options['query']): string {
  const base = env.apiBaseUrl.replace(/\/$/, '')
  const url = `${base}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined) params.set(k, String(v))
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export async function request<T = unknown>(method: Method, path: string, opts: Options = {}): Promise<T> {
  const { body, query, signal, timeoutMs = 15000 } = opts
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  if (signal) signal.addEventListener('abort', () => controller.abort())

  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', 'No se pudo conectar con el servidor', 0)
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 204) return undefined as T

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Respuesta inválida del servidor', res.ok ? 0 : res.status)
  }

  if (!res.ok) {
    const err = data as { error?: string; code?: string }
    throw new ApiError(err.code ?? 'NETWORK_ERROR', err.error ?? 'Error', res.status)
  }
  return data as T
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/apiClient.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/apiClient.ts src/lib/apiClient.test.ts
git commit -m "feat: cliente HTTP tipado con credentials, timeout y normalizacion de errores"
```

---

## Task 8: QueryClient con política de reintentos y key factory (`lib/queryClient.ts`)

**Files:**
- Create: `src/lib/queryClient.ts`
- Test: `src/lib/queryClient.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect } from 'vitest'
import { shouldRetry, keys } from './queryClient'
import { ApiError } from './errors'

describe('shouldRetry', () => {
  it('no reintenta en 4xx', () => {
    expect(shouldRetry(0, new ApiError('PREDICTIONS_LOCKED', 'x', 423))).toBe(false)
    expect(shouldRetry(0, new ApiError('UNAUTHORIZED', 'x', 401))).toBe(false)
  })
  it('reintenta hasta 2 veces en red/5xx', () => {
    expect(shouldRetry(0, new ApiError('NETWORK_ERROR', 'x', 0))).toBe(true)
    expect(shouldRetry(2, new ApiError('NETWORK_ERROR', 'x', 0))).toBe(false)
  })
})

describe('keys', () => {
  it('genera claves estables', () => {
    expect(keys.me()).toEqual(['me'])
    expect(keys.ko.round('r32')).toEqual(['ko', 'round', 'r32'])
    expect(keys.ko.match('uuid-1')).toEqual(['ko', 'match', 'uuid-1'])
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/queryClient.test.ts`
Expected: FAIL — no exporta `shouldRetry`/`keys`.

- [ ] **Step 3: Implementar `src/lib/queryClient.ts`**

```ts
import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './errors'

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  })
}

export const keys = {
  me: () => ['me'] as const,
  groups: {
    all: () => ['groups'] as const,
    predictionsMe: (pid: string) => ['groups', 'predictions', 'me', pid] as const,
    thirds: (pid: string) => ['groups', 'thirds', pid] as const,
    friends: () => ['groups', 'friends'] as const,
  },
  powerups: {
    me: (pid: string) => ['powerups', 'me', pid] as const,
    friends: () => ['powerups', 'friends'] as const,
  },
  ko: {
    round: (slug: string) => ['ko', 'round', slug] as const,
    match: (id: string) => ['ko', 'match', id] as const,
    friends: (id: string) => ['ko', 'friends', id] as const,
  },
  scoreboard: {
    all: () => ['scoreboard'] as const,
    breakdown: (pid: string) => ['scoreboard', 'breakdown', pid] as const,
  },
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/queryClient.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/queryClient.ts src/lib/queryClient.test.ts
git commit -m "feat: queryClient con retry condicional y key factory tipada"
```

---

## Task 9: Reloj de dev (`lib/clock.ts`) — TDD

Único `now()` mutable. El **mock** lo usa para decidir candados; el **front** NO recalcula candados con él (§9.4). Aquí solo creamos la primitiva.

**Files:**
- Create: `src/lib/clock.ts`
- Test: `src/lib/clock.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { now, setNow, resetClock } from './clock'

afterEach(() => resetClock())

describe('clock', () => {
  it('por defecto retorna la hora real (epoch ms > 0)', () => {
    expect(now()).toBeGreaterThan(0)
  })
  it('setNow fija un instante simulado en epoch ms', () => {
    setNow('2026-06-11T17:00:00.000Z')
    expect(now()).toBe(Date.parse('2026-06-11T17:00:00.000Z'))
  })
  it('resetClock vuelve a hora real', () => {
    setNow('2026-06-11T17:00:00.000Z')
    resetClock()
    expect(Math.abs(now() - Date.now())).toBeLessThan(1000)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/clock.test.ts`
Expected: FAIL — no exporta `now`.

- [ ] **Step 3: Implementar `src/lib/clock.ts`**

```ts
let fixedEpochMs: number | null = null

/** Epoch ms actual (real o simulado). Comparaciones de candado SIEMPRE en epoch/UTC. */
export function now(): number {
  return fixedEpochMs ?? Date.now()
}

export function setNow(iso: string): void {
  fixedEpochMs = Date.parse(iso)
}

export function resetClock(): void {
  fixedEpochMs = null
}

/** Solo display: formatea un ISO a hora Colombia. La lógica de candado NO usa esto. */
export function formatDateLocal(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/clock.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/clock.ts src/lib/clock.test.ts
git commit -m "feat: reloj de dev (now/setNow/resetClock) + formato local"
```

---

## Task 10: Estado y semilla del mock (`mocks/db.ts`, `mocks/seed.ts`)

**Files:**
- Create: `src/mocks/db.ts`, `src/mocks/seed.ts`

- [ ] **Step 1: Crear `src/mocks/db.ts`**

```ts
import type { Role } from '../types/enums'

export interface DbParticipant {
  id: string
  googleSub: string
  name: string
  email: string
  phone: string | null
  role: Role
}

export interface DbInvitation {
  id: string
  code: string
  usedByParticipantId: string | null
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

export interface Db {
  currentSessionId: string | null // puntero único de sesión activa (§9.5)
  participants: DbParticipant[]
  invitations: DbInvitation[]
  tournamentStartAt: string // = candado de grupos = scheduledAt del primer partido
}

// Estado mutable compartido por los handlers. Se reemplaza con resetDb().
export let db: Db = makeEmptyDb()

function makeEmptyDb(): Db {
  return { currentSessionId: null, participants: [], invitations: [], tournamentStartAt: '2026-06-11T16:00:00.000Z' }
}

export function setDb(next: Db): void {
  db = next
}
```

- [ ] **Step 2: Crear `src/mocks/seed.ts`**

```ts
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
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/mocks/db.ts src/mocks/seed.ts
git commit -m "feat: estado en memoria y semilla del mock (participants/invitations/session)"
```

---

## Task 11: Helper de JWT falso y handlers de auth (`mocks/jwt.ts`, `mocks/handlers/auth.ts`) — TDD

**Files:**
- Create: `src/mocks/jwt.ts`, `src/mocks/handlers/auth.ts`, `src/mocks/handlers/index.ts`, `src/mocks/server.ts`
- Test: `src/mocks/handlers/auth.test.ts`

- [ ] **Step 1: Crear `src/mocks/jwt.ts` (decodifica payload base64url; no verifica firma)**

```ts
export interface FakeIdTokenPayload {
  sub: string
  email: string
  name: string
  exp?: number // epoch segundos
}

function b64urlEncode(obj: unknown): string {
  const json = JSON.stringify(obj)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(seg: string): string {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/')
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
  return decodeURIComponent(escape(atob(b64 + pad)))
}

/** Construye un ID token falso `header.payload.sig`. */
export function makeFakeIdToken(payload: FakeIdTokenPayload): string {
  return `${b64urlEncode({ alg: 'none' })}.${b64urlEncode(payload)}.sig`
}

/** Decodifica el payload o devuelve null si el token es inválido. */
export function decodeIdToken(token: string): FakeIdTokenPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(b64urlDecode(parts[1])) as FakeIdTokenPayload
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Escribir el test de los handlers de auth (que falla)**

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { server } from '../server'
import { resetDb } from '../seed'
import { setNow, resetClock } from '../../lib/clock'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => { resetDb(); resetClock(); setNow('2026-06-06T12:00:00.000Z'); server.resetHandlers() })

const juanCred = () => makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' })
const newCred = () => makeFakeIdToken({ sub: 'sub-nuevo', email: 'nuevo@gmail.com', name: 'Nuevo' })

describe('POST /auth/login', () => {
  it('200 + sesión para usuario existente', async () => {
    const res = await post('/auth/login', { credential: juanCred() })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 'p-juan', role: 'participant' })
    const me = await fetch(URL('/me'), { credentials: 'include' })
    expect(me.status).toBe(200)
  })
  it('404 USER_NOT_FOUND si no existe', async () => {
    const res = await post('/auth/login', { credential: newCred() })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'USER_NOT_FOUND' })
  })
})

describe('POST /auth/signup', () => {
  it('crea usuario con código disponible, marca usado y abre sesión', async () => {
    const res = await post('/auth/signup', { credential: newCred(), code: 'OK1234', phone: '+573009998877' })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ email: 'nuevo@gmail.com', role: 'participant' })
    // segunda vez con el mismo código → ya usado
    const again = await post('/auth/signup', { credential: makeFakeIdToken({ sub: 's2', email: 'e2@x.com', name: 'E2' }), code: 'OK1234', phone: '+573009998800' })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ code: 'INVITE_ALREADY_USED' })
  })
  it('404 INVITE_NOT_FOUND con código inexistente', async () => {
    const res = await post('/auth/signup', { credential: newCred(), code: 'NOPE00', phone: '+573009998877' })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'INVITE_NOT_FOUND' })
  })
  it('409 INVITE_EXPIRED con código vencido', async () => {
    const res = await post('/auth/signup', { credential: newCred(), code: 'EXP000', phone: '+573009998877' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'INVITE_EXPIRED' })
  })
  it('409 USER_ALREADY_EXISTS si la identidad ya existe', async () => {
    const res = await post('/auth/signup', { credential: juanCred(), code: 'OK1234', phone: '+573009998877' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'USER_ALREADY_EXISTS' })
  })
  it('400 INVALID_PHONE con teléfono mal formado', async () => {
    const res = await post('/auth/signup', { credential: newCred(), code: 'OK1234', phone: '3009998877' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_PHONE' })
  })
  it('401 INVALID_GOOGLE_TOKEN si el credential expiró', async () => {
    const expired = makeFakeIdToken({ sub: 'sub-nuevo', email: 'n@x.com', name: 'N', exp: Math.floor(Date.parse('2026-06-06T11:00:00.000Z') / 1000) })
    const res = await post('/auth/signup', { credential: expired, code: 'OK1234', phone: '+573009998877' })
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ code: 'INVALID_GOOGLE_TOKEN' })
  })
})

describe('GET /me + logout', () => {
  it('401 sin sesión', async () => {
    const res = await fetch(URL('/me'), { credentials: 'include' })
    expect(res.status).toBe(401)
  })
  it('logout cierra la sesión', async () => {
    await post('/auth/login', { credential: juanCred() })
    const out = await post('/auth/logout', {})
    expect(out.status).toBe(204)
    const me = await fetch(URL('/me'), { credentials: 'include' })
    expect(me.status).toBe(401)
  })
})
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `npx vitest run src/mocks/handlers/auth.test.ts`
Expected: FAIL — no existen `server`/handlers.

- [ ] **Step 4: Implementar `src/mocks/handlers/auth.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { decodeIdToken } from '../jwt'
import { now } from '../../lib/clock'
import type { ParticipantMe } from '../../types/api'

const E164 = /^\+[1-9]\d{7,14}$/
const err = (code: string, error: string, status: number) => HttpResponse.json({ error, code }, { status })

function toMe(pId: string): ParticipantMe {
  const p = db.participants.find((x) => x.id === pId)!
  return { id: p.id, name: p.name, email: p.email, role: p.role }
}

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { credential } = (await request.json()) as { credential: string }
    const payload = decodeIdToken(credential)
    if (!payload) return err('INVALID_GOOGLE_TOKEN', 'Token de Google inválido', 401)
    const p = db.participants.find((x) => x.googleSub === payload.sub)
    if (!p) return err('USER_NOT_FOUND', 'Necesitas invitación', 404)
    db.currentSessionId = p.id
    return HttpResponse.json(toMe(p.id), { status: 200 })
  }),

  http.post('/api/auth/signup', async ({ request }) => {
    const { credential, code, phone } = (await request.json()) as { credential: string; code: string; phone: string }
    const payload = decodeIdToken(credential)
    if (!payload) return err('INVALID_GOOGLE_TOKEN', 'Token de Google inválido', 401)
    if (payload.exp && payload.exp * 1000 < now()) return err('INVALID_GOOGLE_TOKEN', 'Token de Google expirado', 401)

    const inv = db.invitations.find((i) => i.code === code)
    if (!inv) return err('INVITE_NOT_FOUND', 'Código no encontrado', 404)
    if (inv.usedByParticipantId) return err('INVITE_ALREADY_USED', 'Código ya utilizado', 409)
    if (Date.parse(inv.expiresAt) < now()) return err('INVITE_EXPIRED', 'Código expirado', 409)
    if (!E164.test(phone)) return err('INVALID_PHONE', 'Formato inválido. Usa E.164 ej: +573001234567', 400)
    if (db.participants.some((x) => x.googleSub === payload.sub)) return err('USER_ALREADY_EXISTS', 'Ya existe una cuenta', 409)

    const id = `p-${payload.sub}`
    db.participants.push({ id, googleSub: payload.sub, name: payload.name, email: payload.email, phone, role: 'participant' })
    inv.usedByParticipantId = id
    inv.usedAt = new Date(now()).toISOString()
    db.currentSessionId = id
    return HttpResponse.json(toMe(id), { status: 201 })
  }),

  http.post('/api/auth/logout', async () => {
    db.currentSessionId = null
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/me', async () => {
    if (!db.currentSessionId) return err('UNAUTHORIZED', 'No autorizado', 401)
    return HttpResponse.json(toMe(db.currentSessionId), { status: 200 })
  }),
]
```

- [ ] **Step 5: Implementar `src/mocks/handlers/index.ts`**

```ts
import { authHandlers } from './auth'

export const handlers = [...authHandlers]
```

- [ ] **Step 6: Implementar `src/mocks/server.ts`**

```ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

- [ ] **Step 7: Correr el test y verificar que pasa**

Run: `npx vitest run src/mocks/handlers/auth.test.ts`
Expected: PASS (todas las ramas de login/signup/me/logout).

- [ ] **Step 8: Commit**

```bash
git add src/mocks/jwt.ts src/mocks/handlers/auth.ts src/mocks/handlers/index.ts src/mocks/server.ts src/mocks/handlers/auth.test.ts
git commit -m "feat: handlers de auth en MSW (login/signup atomico/logout/me) con tests"
```

---

## Task 12: Worker de MSW para el browser y setup de tests

**Files:**
- Create: `src/mocks/browser.ts`, `src/test/setup.ts`
- Generated: `public/mockServiceWorker.js`

- [ ] **Step 1: Implementar `src/mocks/browser.ts`**

```ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

- [ ] **Step 2: Generar el service worker de MSW**

Run: `npx msw init public/ --save`
Expected: crea `public/mockServiceWorker.js`.

- [ ] **Step 3: Implementar `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { server } from '../mocks/server'
import { resetDb } from '../mocks/seed'
import { resetClock, setNow } from '../lib/clock'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => {
  resetDb()
  resetClock()
  setNow('2026-06-06T12:00:00.000Z') // grupos abiertos, torneo no iniciado
})
afterEach(() => server.resetHandlers())
```

- [ ] **Step 4: Quitar los hooks locales de `auth.test.ts` (ahora los provee el setup global)**

El setup global hace `server.listen/close/resetHandlers` y `resetDb/resetClock/setNow`. Tener además los hooks locales en `auth.test.ts` causaría doble `server.listen()`. Edita `src/mocks/handlers/auth.test.ts`: **elimina** este bloque…

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { server } from '../server'
import { resetDb } from '../seed'
import { setNow, resetClock } from '../../lib/clock'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
// ...
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(() => { resetDb(); resetClock(); setNow('2026-06-06T12:00:00.000Z'); server.resetHandlers() })
```

…y **déjalo** así (solo lo necesario; el setup global ya hace listen/reset/setNow):

```ts
import { describe, it, expect } from 'vitest'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
```

- [ ] **Step 5: Verificar que toda la suite corre con el setup global**

Run: `npx vitest run`
Expected: PASS — todos los tests verdes con un único `server.listen` (el del setup global).

- [ ] **Step 6: Commit**

```bash
git add src/mocks/browser.ts src/test/setup.ts public/mockServiceWorker.js src/mocks/handlers/auth.test.ts
git commit -m "feat: worker MSW para browser y setup global de tests"
```

---

## Task 13: Utilidades de test (`src/test/utils.tsx`)

**Files:**
- Create: `src/test/utils.tsx`

- [ ] **Step 1: Implementar `src/test/utils.tsx`**

```tsx
import { type ReactElement, type ReactNode } from 'react'
import { render } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { makeQueryClient } from '../lib/queryClient'
import { AuthProvider } from '../auth/AuthContext'

export { makeFakeIdToken } from '../mocks/jwt'

// Incluye AuthProvider porque las pantallas autenticadas (Dashboard) leen useAuth().
// AuthProvider hace GET /me al montar; MSW lo resuelve (200 con sesión, 401 sin ella).
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = makeQueryClient()
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <AuthProvider>{children}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper }) }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/test/utils.tsx
git commit -m "test: helper renderWithProviders + reexport de makeFakeIdToken"
```

---

## Task 14: Funciones de auth + `AuthContext` (`auth/api.ts`, `auth/AuthContext.tsx`, `auth/useAuth.ts`, `auth/google.ts`)

**Files:**
- Create: `src/auth/api.ts`, `src/auth/google.ts`, `src/auth/AuthContext.tsx`, `src/auth/useAuth.ts`

- [ ] **Step 1: Implementar `src/auth/api.ts`**

```ts
import { request } from '../lib/apiClient'
import type { ParticipantMe, LoginBody, SignupBody } from '../types/api'

export const getMe = () => request<ParticipantMe>('GET', '/me')
export const postLogin = (body: LoginBody) => request<ParticipantMe>('POST', '/auth/login', { body })
export const postSignup = (body: SignupBody) => request<ParticipantMe>('POST', '/auth/signup', { body })
export const postLogout = () => request<void>('POST', '/auth/logout', { body: {} })
```

- [ ] **Step 2: Implementar `src/auth/google.ts`**

```ts
import { env } from '../lib/env'

export const googleClientId = env.googleClientId
```

- [ ] **Step 3: Implementar `src/auth/AuthContext.tsx`**

```tsx
import { createContext, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { keys } from '../lib/queryClient'
import { getMe } from './api'
import { isApiError } from '../lib/errors'
import type { ParticipantMe } from '../types/api'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

export interface AuthValue {
  participant: ParticipantMe | null
  status: AuthStatus
}

export const AuthContext = createContext<AuthValue>({ participant: null, status: 'loading' })

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useQuery({
    queryKey: keys.me(),
    queryFn: getMe,
    retry: (count, e) => !(isApiError(e) && e.status === 401) && count < 2, // no reintentar el 401 esperado de /me
  })

  let status: AuthStatus = 'loading'
  if (isLoading) status = 'loading'
  else if (data) status = 'authenticated'
  else if (isApiError(error) && error.status === 401) status = 'unauthenticated'
  else if (error) status = 'error'

  return <AuthContext.Provider value={{ participant: data ?? null, status }}>{children}</AuthContext.Provider>
}
```

- [ ] **Step 4: Implementar `src/auth/useAuth.ts`**

```ts
import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 5: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/auth/api.ts src/auth/google.ts src/auth/AuthContext.tsx src/auth/useAuth.ts
git commit -m "feat: AuthContext con rehidratacion via /me y funciones api de auth"
```

---

## Task 15: Hooks de mutación de auth (`auth/hooks.ts`) — TDD

**Files:**
- Create: `src/auth/hooks.ts`
- Test: `src/auth/hooks.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { makeQueryClient } from '../lib/queryClient'
import { useLogin, useSignup } from './hooks'
import { makeFakeIdToken } from '../mocks/jwt'

function wrapper() {
  const qc = makeQueryClient()
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useLogin', () => {
  it('resuelve con el participante existente', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })
    result.current.mutate(makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ id: 'p-juan' })
  })
  it('rechaza con USER_NOT_FOUND si no existe', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper: wrapper() })
    result.current.mutate(makeFakeIdToken({ sub: 'sub-x', email: 'x@x.com', name: 'X' }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect((result.current.error as { code: string }).code).toBe('USER_NOT_FOUND')
  })
})

describe('useSignup', () => {
  it('crea cuenta con código válido', async () => {
    const { result } = renderHook(() => useSignup(), { wrapper: wrapper() })
    result.current.mutate({ credential: makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' }), code: 'OK1234', phone: '+573001234567' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ email: 'n@x.com' })
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/auth/hooks.test.tsx`
Expected: FAIL — no exporta `useLogin`/`useSignup`.

- [ ] **Step 3: Implementar `src/auth/hooks.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../lib/queryClient'
import { postLogin, postSignup, postLogout } from './api'
import type { SignupBody } from '../types/api'

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (credential: string) => postLogin({ credential }),
    onSuccess: (me) => qc.setQueryData(keys.me(), me),
  })
}

export function useSignup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SignupBody) => postSignup(body),
    onSuccess: (me) => qc.setQueryData(keys.me(), me),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => postLogout(),
    onSuccess: () => qc.clear(),
  })
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/auth/hooks.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/auth/hooks.ts src/auth/hooks.test.tsx
git commit -m "feat: hooks de auth (useLogin/useSignup/useLogout) con tests"
```

---

## Task 16: Error boundary y manejo central del 401 (`app/ErrorBoundary.tsx`, integración en QueryClient)

**Files:**
- Create: `src/app/ErrorBoundary.tsx`

- [ ] **Step 1: Implementar `src/app/ErrorBoundary.tsx`**

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App error:', error, info)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div>
          <h1>Algo salió mal</h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}>Reintentar</button>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

> Nota: el redirect tras 401 lo realiza `RequireAuth` (Task 17) leyendo `useAuth().status === 'unauthenticated'`. El `apiClient` NO redirige (§5.2/§5.3). `GET /me` queda excluido del "logout-on-401" porque su 401 produce `status: 'unauthenticated'`, que el guard traduce a render de `/login`.

- [ ] **Step 3: Commit**

```bash
git add src/app/ErrorBoundary.tsx
git commit -m "feat: error boundary de app"
```

---

## Task 17: Providers, AppShell, guards y router (`app/*`)

**Files:**
- Create: `src/app/providers.tsx`, `src/app/AppShell.tsx`, `src/app/guards/RequireAuth.tsx`, `src/app/guards/RequireAdmin.tsx`, `src/app/router.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implementar `src/app/providers.tsx`**

```tsx
import { type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { makeQueryClient } from '../lib/queryClient'
import { googleClientId } from '../auth/google'
import { AuthProvider } from '../auth/AuthContext'
import { ErrorBoundary } from './ErrorBoundary'

const queryClient = makeQueryClient()

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 2: Implementar `src/app/guards/RequireAuth.tsx`**

```tsx
import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') return <div>Cargando…</div>
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (status === 'error') return <div>Error de conexión. <button onClick={() => location.reload()}>Reintentar</button></div>
  return <>{children}</>
}
```

- [ ] **Step 3: Implementar `src/app/guards/RequireAdmin.tsx`**

```tsx
import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, participant } = useAuth()
  if (status === 'loading') return <div>Cargando…</div>
  if (status !== 'authenticated') return <Navigate to="/login" replace />
  if (participant?.role !== 'admin') return <div>Acceso denegado</div>
  return <>{children}</>
}
```

- [ ] **Step 4: Implementar `src/app/AppShell.tsx`**

```tsx
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <main>{children}</main>
      <nav>
        <Link to="/">Inicio</Link> | <Link to="/predicciones">Predicciones</Link> | <Link to="/tabla">Tabla</Link>
      </nav>
    </div>
  )
}
```

- [ ] **Step 5: Implementar `src/app/router.tsx`**

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth } from './guards/RequireAuth'
import { AppShell } from './AppShell'
import { Login } from '../features/onboarding/Login'
import { Dashboard } from '../features/home/Dashboard'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell>
          <Dashboard />
        </AppShell>
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
```

- [ ] **Step 6: Completar `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from './app/providers'
import { router } from './app/router'
import { env } from './lib/env'

async function enableMocks() {
  if (!env.useMocks) return
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'warn' })
}

enableMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  )
})
```

> Nota: `Login` y `Dashboard` se crean en Tasks 18–20. Si ejecutas este task antes, crea stubs mínimos que exporten un `<div/>` para que compile, y reemplázalos en sus tasks.

- [ ] **Step 7: Verificar typecheck (tras crear Login/Dashboard o sus stubs)**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/app/providers.tsx src/app/AppShell.tsx src/app/guards/RequireAuth.tsx src/app/guards/RequireAdmin.tsx src/app/router.tsx src/main.tsx
git commit -m "feat: providers, guards (auth/admin), app shell, router y bootstrap"
```

---

## Task 18: Pantalla de Login (`features/onboarding/Login.tsx`) — TDD

`Login` orquesta: GoogleLogin → login; en 404 muestra `Signup` (sub-estado, Task 19). Para tests, se mockea `@react-oauth/google`.

**Files:**
- Create: `src/features/onboarding/Login.tsx`
- Test: `src/features/onboarding/Login.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, makeFakeIdToken } from '../../test/utils'

// Mock de GoogleLogin: un botón que dispara onSuccess con el credential del último set.
let nextCredential = ''
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: nextCredential })}>Google</button>
  ),
}))

import { Login } from './Login'

beforeEach(() => { nextCredential = '' })

describe('Login', () => {
  it('usuario existente → navega a home', async () => {
    nextCredential = makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' })
    renderWithProviders(<Login />, { route: '/login' })
    await userEvent.click(screen.getByText('Google'))
    await waitFor(() => expect(screen.getByText(/redirigiendo/i)).toBeInTheDocument())
  })

  it('usuario sin cuenta → muestra el formulario de signup', async () => {
    nextCredential = makeFakeIdToken({ sub: 'sub-nuevo', email: 'nuevo@gmail.com', name: 'Nuevo' })
    renderWithProviders(<Login />, { route: '/login' })
    await userEvent.click(screen.getByText('Google'))
    await waitFor(() => expect(screen.getByLabelText(/código/i)).toBeInTheDocument())
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/features/onboarding/Login.test.tsx`
Expected: FAIL — no existe `Login`.

- [ ] **Step 3: Implementar `src/features/onboarding/Login.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useLogin } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'
import { Signup } from './Signup'

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

  if (login.isSuccess) return <div>Redirigiendo…</div>
  if (showSignup && credential) {
    return <Signup credential={credential} onNeedRelogin={() => { setShowSignup(false); setCredential(null); setMessage('Tu sesión de Google expiró, inicia de nuevo.') }} />
  }

  return (
    <div>
      <h1>Polla Mundial 2026</h1>
      <GoogleLogin onSuccess={onSuccess} onError={() => setMessage('No se pudo iniciar con Google')} />
      {message && <p role="alert">{message}</p>}
    </div>
  )
}
```

> Nota: este task depende de `Signup` (Task 19). Ejecuta Task 19 antes, o crea un stub `export function Signup() { return <div/> }` temporal. El test de Login solo verifica que aparece el formulario (labels código/teléfono), que provee `Signup` real.

- [ ] **Step 4: Correr el test y verificar que pasa (con `Signup` implementado)**

Run: `npx vitest run src/features/onboarding/Login.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/Login.tsx src/features/onboarding/Login.test.tsx
git commit -m "feat: pantalla de login con google y derivacion a signup"
```

---

## Task 19: Pantalla de Signup (`features/onboarding/Signup.tsx`) — TDD

Sub-estado de Login. Valida E.164 en el front, envía signup atómico, y ante `INVALID_GOOGLE_TOKEN` pide re-login.

**Files:**
- Create: `src/features/onboarding/Signup.tsx`
- Test: `src/features/onboarding/Signup.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, makeFakeIdToken } from '../../test/utils'
import { Signup } from './Signup'

describe('Signup', () => {
  it('rechaza teléfono no E.164 sin llamar al servidor', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(<Signup credential={cred} onNeedRelogin={() => {}} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'OK1234')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '3001234567')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(await screen.findByText(/E\.164/i)).toBeInTheDocument()
  })

  it('código inexistente muestra el error del servidor', async () => {
    const cred = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N' })
    renderWithProviders(<Signup credential={cred} onNeedRelogin={() => {}} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'NOPE00')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '+573001234567')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(await screen.findByText(/no encontrado/i)).toBeInTheDocument()
  })

  it('credential expirado dispara onNeedRelogin', async () => {
    const onNeedRelogin = vi.fn()
    const expired = makeFakeIdToken({ sub: 'sub-n', email: 'n@x.com', name: 'N', exp: 1 })
    renderWithProviders(<Signup credential={expired} onNeedRelogin={onNeedRelogin} />)
    await userEvent.type(screen.getByLabelText(/código/i), 'OK1234')
    await userEvent.type(screen.getByLabelText(/teléfono/i), '+573001234567')
    await userEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(onNeedRelogin).toHaveBeenCalled())
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/features/onboarding/Signup.test.tsx`
Expected: FAIL — no existe `Signup`.

- [ ] **Step 3: Implementar `src/features/onboarding/Signup.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignup } from '../../auth/hooks'
import { isApiError } from '../../lib/errors'

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
    <form onSubmit={onSubmit}>
      <h1>Completa tu registro</h1>
      <label htmlFor="code">Código de invitación</label>
      <input id="code" value={code} onChange={(e) => setCode(e.target.value)} />
      <label htmlFor="phone">Teléfono (E.164)</label>
      <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+573001234567" />
      <button type="submit">Crear cuenta</button>
      {message && <p role="alert">{message}</p>}
    </form>
  )
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/features/onboarding/Signup.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/Signup.tsx src/features/onboarding/Signup.test.tsx
git commit -m "feat: pantalla de signup atomico con validacion E.164 y re-login"
```

---

## Task 20: Dashboard + logout + test negativo de seguridad

**Files:**
- Create: `src/features/home/Dashboard.tsx`
- Test: `src/features/home/Dashboard.test.tsx`

- [ ] **Step 1: Escribir el test que falla (incluye aserción de seguridad)**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils'

let nextCredential = ''
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: nextCredential })}>Google</button>
  ),
}))

import { makeFakeIdToken } from '../../mocks/jwt'
import { useLogin } from '../../auth/hooks'
import { Dashboard } from './Dashboard'

beforeEach(() => { nextCredential = '' })

describe('Dashboard', () => {
  it('muestra el nombre del participante autenticado', async () => {
    // login previo para abrir sesión en el mock
    const { result } = renderHookLogin()
    result.current.mutate(makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    renderWithProviders(<Dashboard />)
    expect(await screen.findByText(/hola, juan/i)).toBeInTheDocument()
  })

  it('NO persiste nada sensible en storage tras login', async () => {
    const { result } = renderHookLogin()
    result.current.mutate(makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
})

// helper local: renderiza solo el hook de login con providers
import { renderHook } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { makeQueryClient } from '../../lib/queryClient'
function renderHookLogin() {
  const qc = makeQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  return renderHook(() => useLogin(), { wrapper })
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/features/home/Dashboard.test.tsx`
Expected: FAIL — no existe `Dashboard`.

- [ ] **Step 3: Implementar `src/features/home/Dashboard.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useLogout } from '../../auth/hooks'

export function Dashboard() {
  const { participant } = useAuth()
  const logout = useLogout()
  const navigate = useNavigate()
  return (
    <div>
      <h1>Hola, {participant?.name ?? '…'}</h1>
      <button onClick={() => logout.mutate(undefined, { onSuccess: () => navigate('/login') })}>Cerrar sesión</button>
    </div>
  )
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/features/home/Dashboard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Correr toda la suite y typecheck**

Run: `npx vitest run && npx tsc -b`
Expected: PASS toda la suite; typecheck sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/features/home/Dashboard.tsx src/features/home/Dashboard.test.tsx
git commit -m "feat: dashboard con logout y test negativo de seguridad de storage"
```

---

## Verificación final de la entrega

- [ ] **Smoke manual del flujo en browser**

Run: `npm run dev`
Pasos: con `VITE_GOOGLE_CLIENT_ID` real, abrir `http://localhost:5173/login`, iniciar con Google. Usuario sembrado → home; usuario nuevo → formulario código+teléfono → home. (Sin clientId real, usar el dev-bypass — fuera de alcance de este plan, llega con `mocks/devApi.ts` en el plan siguiente.)

- [ ] **Suite completa verde**

Run: `npx vitest run`
Expected: todos los tests PASS.

---

## Notas para planes siguientes (no implementar aquí)
- **Plan 2 (pre-torneo):** `mocks/devApi.ts` (dev-bypass `POST /__dev__/login-as` guardado por DEV+MOCKS), tipos de grupos/terceros/powerups en `types/api.ts`, handlers `groups.ts`/`powerups.ts` con candado global (`now ≥ tournamentStartAt`), cascada terceros↔grupos, features `groups/`, `powerups/`, hub `/predicciones`.
- **Plan 3 (Fase B):** KO (`ko.ts`, semántica de triple §9.3.1, lockedAt), scoreboard (orden + desempate), breakdown, admin esencial.
- **Plan 4 (Fase C):** amigos, `/admin/participants`, `/health`.
