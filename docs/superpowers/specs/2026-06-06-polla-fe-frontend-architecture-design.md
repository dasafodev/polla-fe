# Polla Mundial 2026 — Frontend: Arquitectura, Organización e Integración (Entrega 1)

**Fecha:** 2026-06-06
**Estado:** Diseño aprobado + endurecido tras revisión multi-agente, pendiente de revisión final del usuario
**Alcance de esta entrega:** Fontanería. Arquitectura, organización del proyecto e integración con el API vía mocks. **Sin estilos, sin diseño, sin layouts** — páginas crudas (HTML semántico pelado) que ejercitan la lógica y la conexión. El diseño visual es una entrega posterior.

---

## 0. Decisiones tomadas por defecto (CONFIRMAR)

Tras la revisión del panel, estas decisiones se tomaron con criterio para desbloquear el plan. Confírmalas o ajústalas:

- **D1 · Estado de pago (RF-07):** FUERA de alcance de Entrega 1. El contrato no lo modela en ningún schema → hueco a coordinar con backend (§13).
- **D2 · Faseado (§0.1):** Fase A (crítica, debe estar antes del 11-jun) / B / C. Los criterios de éxito (§14) son bloqueantes solo para Fase A.
- **D3 · Cookie en dev:** **proxy de Vite** sirviendo el API bajo el mismo origen (`:5173`), con `SameSite=Lax`. Evita el problema de `Secure` sobre HTTP en cross-origin.
- **D4 · Triple o nada por ronda (pendiente #4 del PDF):** solo **tope global de 3 usos**, sin límite por ronda.
- **D5 · ¿Admin participa? (pendiente #10 del PDF):** el admin **solo administra** (no predice); en el seed no tiene predicciones ni aparece en scoreboard. Conserva sus rutas admin.
- **D6 · Identidad única:** `google_sub` (cierra pendiente #9 del PDF; confirmar con dueño de producto).
- **D7 · CSRF/SameSite en prod:** por defecto **same-site** (front y back bajo el mismo dominio, API en `/api`), `SameSite=Lax`, sin token CSRF extra. Si el back queda en dominio distinto (`SameSite=None`), se añade defensa CSRF.
- **D8 · Visibilidad de amigos:** se mantiene el gate por `scheduledAt` (como el contrato). Confirmar si debe abrirse en el candado (`scheduledAt − 30min`).
- **D9 · Invitación expirada:** el mock deriva "expirado" de `expiresAt < now()` y devuelve un código nuevo propuesto `INVITE_EXPIRED` (a coordinar con backend).

### 0.1 Fases de implementación
- **Fase A (crítica · antes del 11-jun):** `apiClient` + locks/UTC + auth (login/signup/me/logout) + grupos + terceros + powerups + candado global. Más el andamiaje base (providers, router, error boundary, MSW, seed, contrato de test).
- **Fase B:** eliminatorias (KO) + scoreboard + breakdown + admin esencial (invitaciones; cargar grupos/partidos/resultados; top8; scoring-params).
- **Fase C (deseable):** pronósticos de amigos (grupos/powerups/KO), `/admin/participants`, `/health` como sonda, refinamientos.

> La capa de datos (tipos + `api.ts` + handlers MSW) cablea **todo el contrato** desde Fase A, aunque las *pantallas* de B/C lleguen después. Así "connection-ready" no depende del faseado de UI.

---

## 1. Contexto y objetivo

Polla privada para el Mundial 2026, ~20 participantes, solo por invitación. Esta primera entrega del **frontend** construye la base técnica: organización del código, capa de integración con el API (cableada contra el contrato `api-contract.yaml`), y mocks con estado que permiten ejercitar toda la lógica sin backend. Cuando el backend real esté listo, se apaga el flag de mocks y el mismo código apunta al API real sin reescribir.

**No-objetivos de esta entrega:** estilos/diseño/layouts, notificaciones WhatsApp (backend), pagos / estado de pago (D1), llamadas al backend real.

---

## 2. Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Framework | **React 18 + Vite + TypeScript (strict)** | SPA mobile-first, ecosistema, swap mock→real sin fricción |
| Alcance de páginas | **Participante + Admin** (scaffolds crudos), faseado (§0.1) | Cubre el contrato end-to-end sin diluir el camino crítico |
| Naturaleza de la entrega | **Lógica + conexión + organización**, sin estilos | Petición explícita del usuario |
| Login con Google | **`@react-oauth/google` (Google Identity Services)** | La más liviana; produce el ID token de Google; sin proyecto Firebase |
| Modelo de sesión | **Cookie HttpOnly + signup atómico** | Más seguro (JS no lee la cookie) e íntegro (transacción única en el registro) |
| Codegen desde el contrato | **Ninguno (todo a mano)** | Máximo control; tipos centralizados en un solo punto |
| Estado de servidor | **TanStack Query v5** | Invalidación declarativa, loading/error estandarizado, páginas finas |
| Mocks | **MSW con estado en memoria** | Ejercita la lógica real (candados, upserts, usos de triple, gating) |

> ⚠️ **El modelo de auth elegido SUPERSEDE la sección de auth del `api-contract.yaml`.** Ver la tabla de reconciliación en §7.1. Hay que actualizar el contrato y alinear a quien hace el backend (lo coordina el usuario; el backend lo desarrolla otra persona).

---

## 3. Stack y herramientas

- **React 18 + Vite + TypeScript** (strict mode).
- **React Router v6** — routing del lado del cliente + guards.
- **TanStack Query v5** — estado de servidor.
- **MSW** — mocks (worker en browser + server en Vitest, **mismos handlers**).
- **`@react-oauth/google`** — login con Google (ID token).
- **Vitest + React Testing Library** — pruebas de la lógica.
- **ESLint + Prettier**.
- **Sin CSS / sin librería de UI.** HTML semántico crudo, cero estilos.
- Config por `.env`: `VITE_USE_MOCKS`, `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`. **Proxy de Vite** (D3) para servir el API real same-origin en dev.

---

## 4. Estructura del proyecto (organizada por features)

```
src/
  main.tsx                  # bootstrap: arranca MSW si VITE_USE_MOCKS, monta providers + router
  app/
    router.tsx              # definición de rutas
    providers.tsx           # GoogleOAuthProvider, QueryClientProvider, AuthProvider, ErrorBoundary
    AppShell.tsx            # shell crudo + nav inferior + estado de carga mientras /me resuelve
    ErrorBoundary.tsx       # error boundary de app
    guards/                 # RequireAuth (vía GET /me), RequireAdmin
  lib/
    apiClient.ts            # fetch tipado, credentials:'include', timeout, normaliza errores → ApiError
    errors.ts               # ApiError + catálogo de códigos (incluye NETWORK_ERROR)
    queryClient.ts          # config TanStack Query (retry condicional) + key factory tipada
    locks.ts                # helpers de candado que consumen flags del SERVER (no recalculan) + formato local
    clock.ts                # SOLO mock/dev: now() mutable; en prod no se usa para lógica de candado
    env.ts                  # lectura tipada de import.meta.env
  types/
    api.ts                  # tipos del contrato escritos a mano (única fuente FE)
    enums.ts                # roundSlug, error codes (union exhaustivo), scoring keys, status
  auth/
    google.ts               # config de GoogleOAuthProvider (clientId)
    AuthContext.tsx         # { participant, status } — sin token; la sesión vive en la cookie
    useAuth.ts
    hooks.ts                # useMe (GET /me), useLogin, useSignup, useLogout
  features/
    onboarding/             # Login (GoogleLogin), Signup (código + teléfono) como sub-estado de Login
    home/                   # Dashboard
    groups/                 # GroupsList, GroupEditor, Thirds  (+ api.ts + hooks.ts)
    powerups/               # PowerupsForm  (+ api.ts + hooks.ts)
    ko/                     # KoRoundList, KoMatchDetail, BracketView (read-only)  (+ api/hooks)
    scoreboard/             # Scoreboard, Breakdown  (+ api/hooks)
    friends/                # vistas de amigos; orquesta hooks de groups/powerups/ko (sin api.ts propio)
    admin/                  # Invitations, LoadGroups, LoadKoMatches, Results, Top8, ScoringParams, Participants
  components/               # primitivas crudas compartidas (sin estilo)
  mocks/
    browser.ts              # setupWorker
    server.ts               # setupServer (tests)
    db.ts                   # estado en memoria (incluye currentSessionId)
    seed.ts                 # makeDb()/resetDb() — datos semilla que ejercitan TODAS las ramas
    devApi.ts               # endpoints solo-mock (dev bypass de sesión, setNow) tras flag DEV+MOCKS
    handlers/
      index.ts
      auth.ts  groups.ts  ko.ts  powerups.ts  scoreboard.ts  admin.ts  health.ts
```

**Convención:** cada feature de dominio trae su `api.ts` (único sitio que conoce rutas) y `hooks.ts`. `friends/` es la excepción: **solo orquesta** los hooks `*friends` de groups/powerups/ko (los datos de amigos viven embebidos en esos dominios, no en un recurso `friends` propio). Las rutas de amigos cuelgan de **Tabla** (alineado con flujo.png), no de un árbol `/amigos/*` independiente.

---

## 5. Capa API y tipos

### 5.1 Tipos (`types/api.ts`)
Interfaces escritas a mano que reflejan los `components/schemas` del contrato, **anotadas con el schema de origen**. Único punto a actualizar si cambia el YAML. Incluye:

- **Salida (participante):** `Team`, `Group`, `GroupPrediction`, `GroupRanking`, `ThirdCandidate`, `ParticipantPredictions`, `KoMatch`, `KoTeam`, `KoResult`, `KoMyPrediction`, `KoRound`, `FriendKoPrediction`, `MyPowerups`, `PowerupTeam`, `FriendPowerups`, `ScoreboardEntry`, `ScoreBreakdown`, `Invitation`, `HealthResponse`, `ErrorResponse`.
- **Sub-objetos `pointsEarned`** (estructuras distintas por dominio, parte central de mostrar puntajes): `GroupPointsEarned`, `ThirdPointsEarned`, `KoPointsEarned`, `PowerupsPointsEarned` (cada uno `object | null`).
- **Input admin:** `TeamInput`, `GroupInput`, `KoMatchInput` (`homeTeamId`/`awayTeamId` nullable con labels placeholder; `externalMatchId` 1–104).
- **Tipo de contrato abierto:** `AdminParticipant` (definido a mano: `id, name, email, phone, role, total, paymentStatus`) — el contrato deja `GET /admin/participants` "pendiente"; ver §13.
- **`ParticipantMe` (forma del modelo nuevo, SUPERSEDE el schema del contrato):** `{ id, name, email, role }`. **Se eliminan `hasJoined`/`hasPhone`** (con signup atómico un usuario existe completo o no existe). `AuthResponse.token` no aplica (sesión cookie). Las respuestas de `/auth/login`, `/auth/signup` y `/me` devuelven exactamente este `ParticipantMe` (sin token).

### 5.2 Cliente (`lib/apiClient.ts`)
Un `request<T>(method, path, { body, query, signal }): Promise<T>` que:
- antepone `VITE_API_BASE_URL` (o la ruta del proxy de Vite en dev),
- envía **`credentials: 'include'`** en toda petición (sin header `Authorization`),
- aplica un **timeout** vía `AbortController` (el `fetch` no tiene timeout por defecto),
- serializa/deserializa JSON,
- en respuestas no-2xx parsea `{ error, code }` y lanza **`ApiError(code, message, status)`**,
- **normaliza fallo de red o respuesta no-JSON** (back caído devolviendo HTML, fetch rechazado, timeout) a `ApiError('NETWORK_ERROR', …, 0)`,
- **NO hace side-effects de routing.** No conoce el router ni el QueryClient. Solo mapea a `ApiError`.

### 5.3 Manejo de 401 y errores transitorios (capa app, no `apiClient`)
- La reacción al **401** vive en `QueryCache.onError` / `MutationCache.onError` (`lib/queryClient.ts`) o en un único efecto de la capa app: invalida `me` y deja que `RequireAuth` renderice `/login`. **Se excluye `GET /me`** de "logout-on-401" (su 401 es el estado *normal* de no-autenticado, no un error a desloguear).
- **Error boundary** de app + **estado de carga del shell** mientras `/me` está in-flight.
- En `RequireAuth`, distinguir **401** (no logueado → `/login`) de **`NETWORK_ERROR`** (transitorio → mostrar "reintentar", no expulsar).

### 5.4 Funciones por feature (`features/*/api.ts`)
Envuelven `request<T>()` con tipos concretos (único sitio que conoce rutas). Diferencia a documentar: `getKoMatches(round)` retorna `{ round, matches }`; `getKoMatch(id)` retorna `KoMatch` suelto (404 `MATCH_NOT_FOUND`). Cobertura completa del contrato (ver matriz §15).

---

## 6. Estado de servidor (TanStack Query)

- **Key factory tipada** en `lib/queryClient.ts` (`keys.groups.predictionsMe()`, `keys.ko.match(id)`, `keys.ko.round(slug)`, …) en vez de strings sueltos → invalidación type-safe y grafo de dependencias en un solo lugar.
- **Las queries por-usuario incluyen el `participantId`** en su key (o se hace `queryClient.clear()` al cambiar de sesión) para evitar estado cruzado al cambiar de usuario (relevante con el dev-bypass).
- Un hook por operación: `useMe`, `useGroups`, `useMyGroupPredictions`, `useSaveGroupPredictions`, `useThirds`, `useSaveThirds`, `usePowerups`, `useSavePowerups`, `useKoMatches(round)`, `useKoMatch(id)`, `useSaveKoPrediction`, `useFriendsGroups`, `useFriendsPowerups`, `useFriendsKo(matchId)`, `useScoreboard`, `useBreakdown(participantId)`, y los de admin.
- **Política de reintentos/timeout (decisión explícita):** no reintentar en 4xx (400/404/409/423 son determinísticos del negocio); reintentos solo en 5xx/red para GET; **`retry: 0` en TODAS las mutaciones** (evita doble POST → `PREDICTION_ALREADY_EXISTS`); timeout de red en `apiClient`.
- **Sin optimistic updates en esta entrega.** Las mutaciones invalidan las queries afectadas en `onSuccess` y TanStack refetchea. (Casi todas tienen validación de servidor rechazable; el rollback optimista añade complejidad sin valor en una UI cruda.)
- **Invalidaciones clave:** guardar grupo → invalida `groups/predictions/me` **y** `groups/thirds` (cambian candidatos); guardar KO → invalida ese partido + la ronda; login/signup/logout → invalida `me`. **Mutaciones de admin** que cargan/corrigen resultados, top8 o scoring-params → invalidan `scoreboard`, `breakdown` y la ronda KO afectada (RF-08/RF-32).

---

## 7. Autenticación (Google → cookie HttpOnly, signup atómico)

**Identidad:** el backend usa `google_sub` (no el email) como llave única.

**Flujo en el front:**
1. App envuelta en `<GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>`.
2. Pantalla `/login`: componente **`<GoogleLogin>`** → `onSuccess` entrega `credential` (ID token). Manejar también **`onError`** (popup cerrado, cookies de terceros bloqueadas, FedCM no disponible) con mensaje crudo.
3. `POST /auth/login { credential }`:
   - **200** → a `/` (home).
   - **404 `USER_NOT_FOUND`** → mostrar **Signup** (campos código + teléfono, validados en el front: E.164 `^\+[1-9]\d{7,14}$` y código no vacío) → `POST /auth/signup { credential, code, phone }` → 200 → home.
4. **Caducidad/replay del credential:** si `/auth/signup` devuelve `INVALID_GOOGLE_TOKEN` (el token expiró mientras se llenaba el formulario, o el back rechazó por replay), **re-montar `<GoogleLogin>`** para obtener un `credential` fresco y reintentar, en vez de fallar en seco. (El back NO debe aplicar anti-replay entre login y signup — anotar en el contrato.)
5. **Signup es sub-estado de `/login`, no una ruta navegable con refresh seguro:** el `credential` vive solo en memoria; ante refresh/back sin `credential`, forzar re-login con `<GoogleLogin>`.
6. Al cargar cualquier ruta protegida: `GET /me`. **200** → render; **401** → `/login`; **`NETWORK_ERROR`** → reintentar (no expulsar). Rehidrata sin guardar nada sensible en el cliente.
7. **Logout:** botón → `POST /auth/logout` → invalida `me` + `queryClient.clear()` → `/login`.

**Notas:**
- `AuthContext` cachea solo el `participant` (de `GET /me`); **no guarda token**. Test negativo de seguridad: tras login, nada en `localStorage`/`sessionStorage` y el `apiClient` nunca añade `Authorization` (§11).
- **Dev-bypass:** vive en `mocks/devApi.ts` como endpoint solo-mock (p.ej. `POST /__dev__/login-as`) que setea `db.currentSessionId`, **guardado por `import.meta.env.DEV && VITE_USE_MOCKS`** (imposible en build de prod). Nunca como rama dentro de `AuthContext`/hooks de producción.

### 7.1 Tabla de reconciliación con el contrato (para el backend)
| Contrato actual | Modelo nuevo | Acción en `api-contract.yaml` |
|---|---|---|
| `POST /auth/google` (find-or-create, devuelve token) | `POST /auth/login { credential }` | **MODIFICAR/RENOMBRAR**: solo login; 404 `USER_NOT_FOUND` si no existe |
| `POST /auth/join { code }` + `POST /auth/phone { phone }` | `POST /auth/signup { credential, code, phone }` (transacción) | **ELIMINAR** ambos; sus campos migran a signup |
| `AuthResponse { token, participant }` | `ParticipantMe` (sin token) | **ELIMINAR** `token`; respuestas devuelven `ParticipantMe` |
| (no existe) | `GET /me` | **AÑADIR** |
| (no existe) | `POST /auth/logout` (204) | **AÑADIR** |
| `security: bearerAuth` global | cookie de sesión HttpOnly | **MODIFICAR** `securitySchemes`; `responses/Unauthorized` = "sesión ausente o inválida" |
| `ParticipantMe { …, hasJoined, hasPhone }` | `ParticipantMe { id, name, email, role }` | **MODIFICAR**: quitar `hasJoined`/`hasPhone` |
| Códigos | `USER_NOT_FOUND` (404), `USER_ALREADY_EXISTS` (409), `INVITE_EXPIRED` (D9) | **AÑADIR** |

### 7.2 Transporte de la cookie (dev vs prod)
- **Dev (D3):** proxy de Vite (`server.proxy`) sirve el API bajo `:5173` → la cookie pasa a ser **same-site** (`SameSite=Lax`, sin `Secure`, funciona sobre HTTP). Sin esto, `Secure` cross-origin sobre HTTP plano haría que Chrome **no almacene** la cookie y el swap real fallaría en el primer `GET /me`.
- **Prod (D7):** preferimos **same-site** (API en `/api` del mismo dominio), `SameSite=Lax`. Si el back queda en dominio distinto → `SameSite=None; Secure` + CORS con credenciales (`Access-Control-Allow-Credentials: true`, origin explícito, no wildcard) **y** defensa CSRF (header custom tipo `X-Requested-With` que CORS bloquee cross-site, o double-submit token).

---

## 8. Routing y guards

- **Público:** `/login` (la pantalla Signup es un sub-estado de `/login`, §7.5).
- **`RequireAuth`:** hace `GET /me`; 200 → pasa; 401 → `/login`; `NETWORK_ERROR` → reintentar. (No hay guard de onboarding progresivo: signup atómico.)
- **Participante:** `/` (Dashboard), `/predicciones` (hub), `/predicciones/grupos`, `/predicciones/grupos/:groupId`, `/predicciones/terceros`, `/predicciones/powerups`, `/predicciones/revisar`, `/eliminatorias`, `/eliminatorias/:round`, `/eliminatorias/partido/:matchId`, `/tabla`, `/tabla/:participantId` (breakdown). **Amigos** cuelgan de `/tabla` (vistas dentro de la sección Tabla), no en `/amigos/*`.
- **`RequireAdmin`** (`role === 'admin'`): `/admin`, `/admin/invitaciones`, `/admin/grupos`, `/admin/partidos`, `/admin/resultados`, `/admin/top8`, `/admin/parametros`, `/admin/participantes`.
- **Nav inferior** crudo: Inicio / Predicciones / Tabla.
- **Bracket:** listas anidadas read-only (la versión visual queda para diseño).

---

## 9. Mocks con estado (MSW) — el corazón de la entrega

### 9.1 Estado (`db.ts`)
`participants` (con `google_sub`), **`currentSessionId`** (puntero único de sesión activa, §9.5), `invitations`, `teams`, `groups`, `groupPredictions` (por participante+grupo), `thirdsSelections`, `powerups`, `koRounds`, `koMatches`, `koPredictions`, `scoringParams`, `tripleUses` (por participante). Constante única **`tournamentStartAt`** (= 11-jun = candado de grupos = `scheduledAt` del primer partido).

### 9.2 Semilla (`seed.ts` → `makeDb()` / `resetDb()`)
- 12 grupos A–L con 48 equipos (ilustrativos), 8 con `isTop8`.
- `scoringParams` por defecto (todas las keys del contrato).
- Un **admin** que NO predice (D5) + varios participantes.
- **Datos que ejercitan TODAS las ramas (no solo el camino feliz):** un participante con los 12 grupos completos + terceros elegidos (para friends/breakdown), uno con powerups ya guardados (409 en POST / 200 en PUT), un partido KO `finished` con `result` (423 `MATCH_FINISHED`, `pointsEarned` no-null), un partido con `lockedAt` ya pasado (`MATCH_LOCKED` sin tocar el reloj), un participante con `tripleUses` agotados (`TRIPLE_USES_EXHAUSTED`), **dos participantes empatados en total con distinto # de exactos en KO** (desempate, §9.3), y un código de invitación `disponible`/`usado`/expirado (`expiresAt < now()`). Ronda **r32** sembrada.

### 9.3 Lógica que los handlers honran
- **`/auth/login`**: busca por `google_sub` → 200 + setea `currentSessionId`, o 404 `USER_NOT_FOUND`.
- **`/auth/signup`**: verifica credential (401 `INVALID_GOOGLE_TOKEN`), valida código (`INVITE_NOT_FOUND` 404 / `INVITE_ALREADY_USED` 409 / `INVITE_EXPIRED` D9 derivado de `expiresAt < now()`), identidad única por `google_sub` (409 `USER_ALREADY_EXISTS`), E.164 (400 `INVALID_PHONE`); transacción simulada: crea participante + marca código usado + setea sesión.
- **`/auth/logout`** (204): limpia `currentSessionId`. **`GET /me`**: devuelve el `ParticipantMe` de la sesión (200) o 401.
- **Grupos** (`POST /groups/predictions`): upsert por grupo; **candado global** (now ≥ `tournamentStartAt` → 423 `PREDICTIONS_LOCKED`); valida rankings (4 posiciones, sin duplicados, equipos del grupo → 400 `INVALID_RANKINGS`). **Cascada:** al re-upsert de un grupo, recalcular candidatos a tercero y **purgar de `thirdsSelections`** cualquier `teamId` que deje de ser posición-3 (baja `selectedCount`, fuerza re-selección).
- **Terceros** (`/groups/thirds`): deriva candidatos desde la posición 3 de cada grupo completo. La pantalla se habilita **solo cuando `completedGroups === 12`** (12 candidatos); `POST` exige exactamente 8 candidatos válidos (400 `INVALID_THIRDS_COUNT` / `INVALID_THIRD_CANDIDATE`); candado global.
- **Powerups**: `darkHorse` `isTop8:false`, `disappointment` `isTop8:true` (400); 409 si ya existen (POST) / 404 si no (PUT); candado. El `pointsEarned` que genera el mock respeta la dirección: `darkHorse ≥ 0`, `disappointment ≤ 0` (RF-21/RF-24).
- **KO** (`GET /ko/matches`): por `roundSlug`; `lockedAt = scheduledAt − 30min`, `lockedIn = now ≥ lockedAt`; incluye `result` y `myPrediction`. `GET /ko/matches/{id}` → `KoMatch` suelto (404).
- **KO predicciones** (`POST`/`PUT`): **candado cerrado cuando `now ≥ lockedAt` → 423 `MATCH_LOCKED`** (convención §9.4); `teamAdvancesId` válido (400 `INVALID_TEAM_ADVANCES`); usos de triple (§9.3.1, 400 `TRIPLE_USES_EXHAUSTED`); 409 si ya existe (POST) / 404 si no (PUT); 423 `MATCH_FINISHED` si `finished`.
- **Amigos**: grupos/powerups `available` solo si `now ≥ tournamentStartAt`; KO si `now ≥ match.scheduledAt`. Si no, `available:false` + `availableAt` (D8).
- **Scoreboard**: **ordena por `total` descendente y rompe empates por mayor # de marcadores exactos en KO** (RF-40); asigna `rank` y `prize` (700000/250000/50000 para 1/2/3). **Breakdown** coherente con el scoreboard (mismo total, mismo `tripleUsesRemaining`, mismo `prize`).
- **Recálculo** (RF-08/RF-32): `PUT /admin/ko/matches/{id}/result`, top8 y scoring-params recomputan el estado derivado del mock (scoreboard, breakdown, `pointsEarned`) y disparan invalidación (§6).
- **Admin**: invitaciones (crear/listar; filtro `status` solo `available|used` según contrato — "expirado" se deriva de `expiresAt`, no es un estado del enum), cargar grupos (409 `GROUPS_ALREADY_LOADED`), cargar partidos KO por ronda (respeta `homeTeamId`/`awayTeamId` nullable + labels), cargar/corregir resultado, top8, scoring-params, participantes. Protegidos por sesión + `role==='admin'` (403 `FORBIDDEN`).
- **`/health`** (público, sin sesión): `HealthResponse` (sonda para verificar el swap mock→real, Fase C).

#### 9.3.1 Semántica de usos de triple
`tripleUses` es el **recuento derivado** de las predicciones del participante con `tripleActive:true` (fuente de verdad única). Reglas: `POST` con `triple=true` consume 1; `PUT false→true` consume 1; `PUT true→false` **libera** 1; `PUT true→true`/`false→false` sin cambio; nunca <0 ni >3 (tope global, D4 — sin límite por ronda). `tripleUsesRemaining` es consistente en POST/PUT y en `GET /scoreboard/{id}/breakdown`. `TRIPLE_USES_EXHAUSTED` es **400 (validación inline)**, no 423/candado.

### 9.4 Reloj de dev (`lib/clock.ts`) y candados
- El **mock** usa un `now()` mutable interno para **decidir** qué devuelve (`lockedIn`, `available`, `status`, 423). Expone `setNow()`/`getNow()` importables para tests.
- **El FRONT nunca recalcula candados:** consume los flags derivados del server (`lockedIn`, `lockedAt`, `available`, `availableAt`, `status`) vía `lib/locks.ts`. Cualquier `now` puramente visual (countdown) usa `Date.now()`, no el clock del mock. Esto preserva la promesa de swap mock→real (§14) y evita duplicar reglas FE↔BE.
- **Convención única de borde:** *cerrado cuando `now ≥ límite`* para grupos Y KO. (Corrige la redacción invertida de versiones previas.) Tests de borde exacto: `now == tournamentStartAt` y `now == lockedAt` dan 423; un ms antes permite guardar.
- **Política de zona horaria:** TODA comparación de candado se hace en **epoch/UTC** (`Date.parse(ISO)` + `now()` epoch). La hora local (America/Bogota, UTC-5) es **solo formato de display** (`formatDateLocal(iso)` centralizado). Hoy 2026-06-06: grupos **abiertos**, torneo **no iniciado**.

### 9.5 Sesión simulada
MSW **no** da semántica HttpOnly real (el `Set-Cookie` del service worker no entra al cookie jar), y `credentials:'include'` no le entrega identidad al handler. Por eso `db` mantiene un **`currentSessionId` único** (una sola sesión activa por instancia de mock) que `login`/`signup`/`logout`/dev-bypass mutan y **todos** los handlers protegidos leen. El código del front es **idéntico al de producción** (usa `credentials:'include'` + `GET /me`, nunca lee la cookie); solo el mock finge la cookie con estado global.

---

## 10. Manejo de errores

`ApiError` con `code`. Los componentes muestran el `error` (en español del contrato) en texto crudo. **401** → manejo central (§5.3); **403** → acceso denegado; **423** → candado inline + inputs deshabilitados; **400/404/409** → inline; **`NETWORK_ERROR`** → mensaje de conexión + reintentar.

**Catálogo de códigos** (`types/enums.ts`, union exhaustivo; marca cuáles vienen del contrato y cuáles son propuestas a coordinar):

| Código | Status | Origen |
|---|---|---|
| `UNAUTHORIZED` / `FORBIDDEN` | 401 / 403 | contrato |
| `VALIDATION_ERROR`, `INVALID_GOOGLE_TOKEN` | 400 / 401 | contrato |
| `INVITE_NOT_FOUND` / `INVITE_ALREADY_USED` | 404 / 409 | contrato |
| `INVITE_EXPIRED` | 409 | **propuesto (D9)** |
| `USER_NOT_FOUND` (login sin cuenta) | 404 | **propuesto** |
| `USER_ALREADY_EXISTS` (identidad duplicada) | 409 | **propuesto** |
| `INVALID_PHONE` / `PHONE_ALREADY_EXISTS` | 400 / 409 | contrato |
| `PREDICTIONS_LOCKED` | 423 | contrato |
| `INVALID_RANKINGS`, `INVALID_THIRD_CANDIDATE`, `INVALID_THIRDS_COUNT` | 400 | contrato |
| `INVALID_DARK_HORSE`, `INVALID_DISAPPOINTMENT` | 400 | contrato |
| `POWERUPS_ALREADY_EXISTS` / `POWERUPS_NOT_FOUND` | 409 / 404 | contrato |
| `MATCH_LOCKED`, `MATCH_FINISHED` | 423 | contrato |
| `INVALID_TEAM_ADVANCES`, `TRIPLE_USES_EXHAUSTED` | 400 | contrato |
| `PREDICTION_ALREADY_EXISTS` / `PREDICTION_NOT_FOUND` | 409 / 404 | contrato |
| `MATCH_NOT_FOUND`, `ROUND_NOT_FOUND`, `PARAM_NOT_FOUND`, `GROUPS_ALREADY_LOADED`, `PARTICIPANT_NOT_FOUND` | 404 / 404 / 404 / 409 / 404 | contrato |
| `NETWORK_ERROR` | 0 | **front (no del contrato)** |

---

## 11. Testing

Vitest + RTL + MSW (server de node, **mismos handlers**).

**Contrato de test (requisito de diseño):** `QueryClient` nuevo por test con `defaultOptions.retry:false`; `resetDb()`/reseed en `beforeEach` (+ `server.resetHandlers()`); `setNow()`/reset del reloj; helper `renderWithProviders(ui)` que envuelve `QueryClientProvider` + router.

**Ramas a cubrir:**
- **Auth:** login existente (200→home); login sin cuenta (404→signup); signup atómico (código inválido/usado/expirado, identidad duplicada, E.164 inválido); credential expirado → re-login; rehidratación `GET /me` (200/401); logout limpia caché; **test negativo de seguridad** (nada en storage, sin header `Authorization`).
- **Candados:** borde exacto grupos (`now == tournamentStartAt`) y KO (`now == lockedAt`) → 423; un ms antes permite guardar.
- **Terceros:** <12 grupos completos → no se puede seleccionar 8; cascada (editar grupo cambia el 3° → el tercero deja de estar `selected`).
- **Powerups:** elegibilidad por `isTop8` (400).
- **Triple:** las 4 transiciones (POST true; PUT false→true; PUT true→false libera; idempotencia) + tope 3 (`TRIPLE_USES_EXHAUSTED` 400).
- **Scoreboard:** orden por total + **desempate por exactos en KO**; coherencia scoreboard↔breakdown.
- **Recálculo:** corregir resultado de admin → cambia scoreboard/breakdown.
- **Amigos:** gating por `tournamentStartAt` / `scheduledAt`.
- **Red:** `NETWORK_ERROR` (back caído/timeout) → mensaje + reintentar; `RequireAuth` no expulsa en red.
- **Admin:** `RequireAdmin` (403 a no-admin).

Durante la implementación se trabaja con **TDD**.

---

## 12. Configuración (`.env` + Vite)

```
VITE_USE_MOCKS=true
VITE_API_BASE_URL=/api          # en dev, vía proxy de Vite (mismo origen); en prod, dominio same-site
VITE_GOOGLE_CLIENT_ID=<oauth-client-id>
```
- **`vite.config.ts`** `server.proxy`: enruta `/api` → `http://localhost:3000` en dev (D3), para que la cookie sea same-site sobre HTTP.
- `.env.example` versionado. README con instrucciones de arranque y **checklist de cabeceras** para el swap real (`Access-Control-Allow-Credentials`, origin explícito, `SameSite`, prueba de humo a `/health` y `/me`).
- `GOOGLE_CLIENT_ID` y el secreto de firma del JWT de sesión viven en el back (env), nunca en el código.

---

## 13. Supuestos y riesgos

1. **El modelo de auth reemplaza la sección de auth del contrato** (tabla §7.1). Hay que actualizar `api-contract.yaml` y alinear al backend (lo coordina el usuario).
2. **Verificación del token en el back:** ID token de Google (`google-auth-library`, `verifyIdToken`); identidad por `google_sub`; **sin anti-replay** entre login y signup.
3. **Cookie en dev:** depende del proxy de Vite same-origin (D3); sin él, el swap real falla en el primer `GET /me`.
4. **CSRF (D7):** con `SameSite=None` cross-domain hay que añadir defensa CSRF; por defecto apuntamos a same-site.
5. **Huecos de contrato a coordinar:** (a) **estado de pago** RF-07 (D1, sin schema); (b) `GET /admin/participants` "pendiente de implementar" sin schema → `AdminParticipant` definido a mano; (c) `GET /health` (cubierto en Fase C); (d) `INVITE_EXPIRED` (D9); (e) códigos `USER_NOT_FOUND`/`USER_ALREADY_EXISTS`.
6. **Mock no da HttpOnly real:** sesión simulada con `currentSessionId` (§9.5); código del front igual a producción. El swap cookie/CORS solo se valida de verdad contra el back real (prueba de humo, §12).
7. **Datos semilla ilustrativos:** no son el sorteo oficial; sirven para ejercitar la lógica.
8. **Mantenimiento manual de tipos:** `types/api.ts` debe actualizarse si cambia el contrato.
9. **flujo.png quedó obsoleto** en la banda de Acceso: dibuja código y teléfono como pantallas separadas (modelo viejo de 3 pasos); el modelo nuevo las colapsa en `/auth/signup`. Actualizar el diagrama en la entrega de diseño.

---

## 14. Criterios de éxito de la entrega

- **Fase A (bloqueante para el 11-jun):** el proyecto arranca con `VITE_USE_MOCKS=true` y se recorre login/signup → grupos → terceros → powerups → revisar, sobre páginas crudas, con toda la lógica de auth y candado de grupos **ejercitada y probada**.
- **Fase B/C (deseable):** eliminatorias, tabla/breakdown, amigos y admin completos.
- Toda la lógica de negocio cubierta (auth cookie+atómico, candados con borde exacto, upserts+cascada, terceros, triple, desempate, recálculo, gating, red) queda **probada** vía mocks + tests.
- Apagar `VITE_USE_MOCKS` apunta al backend real **sin cambios de código** (el front consume flags del server, no recalcula; cookie same-site vía proxy).
- Cero estilos: HTML crudo en todas las páginas.

---

## 15. Matriz de cobertura del contrato (endpoint → función → hook → handler)

| Endpoint | `api.ts` | hook | handler | Fase |
|---|---|---|---|---|
| `GET /health` | `getHealth` | `useHealth` | health | C |
| `POST /auth/login` *(nuevo)* | `postLogin` | `useLogin` | auth | A |
| `POST /auth/signup` *(nuevo)* | `postSignup` | `useSignup` | auth | A |
| `POST /auth/logout` *(nuevo)* | `postLogout` | `useLogout` | auth | A |
| `GET /me` *(nuevo)* | `getMe` | `useMe` | auth | A |
| `GET /groups` | `getGroups` | `useGroups` | groups | A |
| `POST /groups/predictions` | `postGroupsPredictions` | `useSaveGroupPredictions` | groups | A |
| `GET /groups/predictions/me` | `getMyGroupPredictions` | `useMyGroupPredictions` | groups | A |
| `GET /groups/predictions/friends` | `getFriendsGroups` | `useFriendsGroups` | groups | C |
| `GET/POST /groups/thirds` | `getThirds`/`postThirds` | `useThirds`/`useSaveThirds` | groups | A |
| `POST/PUT/GET /powerups/predictions[/me]` | `…Powerups` | `usePowerups`/`useSavePowerups` | powerups | A |
| `GET /powerups/predictions/friends` | `getFriendsPowerups` | `useFriendsPowerups` | powerups | C |
| `GET /ko/matches?roundSlug` | `getKoMatches` | `useKoMatches` | ko | B |
| `GET /ko/matches/{id}` | `getKoMatch` | `useKoMatch` | ko | B |
| `POST/PUT /ko/matches/{id}/predictions` | `saveKoPrediction` | `useSaveKoPrediction` | ko | B |
| `GET /ko/matches/{id}/predictions/friends` | `getFriendsKo` | `useFriendsKo` | ko | C |
| `GET /scoreboard` | `getScoreboard` | `useScoreboard` | scoreboard | B |
| `GET /scoreboard/{id}/breakdown` | `getBreakdown` | `useBreakdown` | scoreboard | B |
| `POST/GET /admin/invitations` | `…Invitations` | admin hooks | admin | A/B |
| `POST /admin/groups` | `postAdminGroups` | admin hooks | admin | B |
| `POST /admin/ko/matches` | `postAdminKoMatches` | admin hooks | admin | B |
| `PUT /admin/ko/matches/{id}/result` | `putAdminKoResult` | admin hooks | admin | B |
| `PUT /admin/scoring-params/{key}` | `putScoringParam` | admin hooks | admin | B |
| `PUT /admin/top8` | `putTop8` | admin hooks | admin | B |
| `GET /admin/participants` *(contrato abierto)* | `getAdminParticipants` | admin hooks | admin | C |
