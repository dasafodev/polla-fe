# polla-fe — Frontend Polla Mundial 2026

SPA de pronósticos para el Mundial 2026 (polla privada por invitación, ~20 participantes).
React 18 + TypeScript + Vite, TailwindCSS v4, React Query, React Router, Framer Motion,
Google OAuth. Mobile-first.

- **Front desplegado:** https://app.paulpredice.com
- **API:** https://api.paulpredice.com (`VITE_API_BASE_URL`; en dev se proxea bajo `/api`)
- **Idioma:** responder y escribir copy/commits en **español**.

## Despliegue

**Cada push a `main` despliega a producción automáticamente.** Un webhook en la VM donde
está desplegado el front detecta el push a `main` y dispara el despliegue solo. No hay
staging: lo que entra a `main` queda en vivo para los usuarios. Antes de hacer push
verifica que el build pasa (`npm run build`), los tests pasan (`npm test`) y la UI quedó bien.

## Alcance: SOLO frontend

Mi responsabilidad es **únicamente el front**. El código del backend está en
`/home/ubuntu/repos/polla/polla-be` (Fastify + Prisma) y es **solo de lectura**.

**Por ningún motivo se modifica el backend.** Se consulta como fuente de verdad para
entender contratos y comportamiento, jamás se edita, commitea ni despliega. Cualquier
cambio que requiera el backend se **reporta**, no se hace.

Para hacer cumplir esto, el repo del backend tiene el push deshabilitado a dos capas:
un hook `.git/hooks/pre-push` que rechaza todo push, y la URL de push del remoto puesta
en `no_push`. El `fetch`/`pull` sigue funcionando (lectura), solo el push está bloqueado.

## Validar contratos contra la fuente real

Antes de asumir la forma de un request/response o el comportamiento de un endpoint,
**verifícalo en la fuente**, no de memoria ni por inferencia:

1. `api-contract.yaml` (OpenAPI) en este repo, y
2. el código real del handler en `/home/ubuntu/repos/polla/polla-be`.

Ojo a las traducciones de la frontera del cliente (`src/lib/contract.ts`): el backend
serializa enums de Prisma en MAYÚSCULAS (`R32`, `SCHEDULED`, `PARTICIPANT`) y usa `THIRD`
donde el FE usa `3rd`. Hay campos que el backend **no** envía y la FE calcula (p. ej.
EXACTO/PARCIAL). Si el contrato y el backend discrepan, manda el backend.

## Bugs: primero el test que lo reproduce

Cuando se reporte un bug, el flujo es **test-first**:

1. Escribe un test (Vitest + Testing Library / MSW) que **falle reproduciendo exactamente
   ese error**.
2. Confírmalo rojo.
3. Recién entonces implementa el fix.
4. El mismo test ahora pasa en verde, y corre `npm test` completo para no romper nada.

## Cambios de UI: verificar con screenshots

Tras cualquier cambio visual, **toma screenshots y revísalos** para confirmar que todo
quedó bien (layout, estados, mobile). El proyecto trae Playwright sobre el Chrome del
sistema; usa `scripts/dev-smoke.mjs` como referencia (viewport 390×844, `page.screenshot`).
No des por bueno un cambio de UI sin haberlo visto renderizado.

## Comandos

```bash
npm run dev        # dev server :5173 (proxy /api → api.paulpredice.com; POLLA_DEV_API para backend local)
npm run build      # tsc -b && vite build (debe pasar antes de push)
npm test           # vitest run
npm run lint       # eslint
npm run smoke      # smoke de browser end-to-end (requiere dev server con VITE_USE_MOCKS=true)
```

## Estructura

- `src/features/*` — vistas por dominio (home, predicciones, groups, ko, powerups, scoreboard, admin, rules, onboarding)
- `src/lib/*` — apiClient, contract, clock, queryClient, helpers (cada uno con su `.test.ts`)
- `src/mocks/*` — handlers MSW (mocks in-process con `VITE_USE_MOCKS=true`)
- `src/types/*` — `api.ts`, `enums.ts`
- `api-contract.yaml` — contrato OpenAPI del backend
