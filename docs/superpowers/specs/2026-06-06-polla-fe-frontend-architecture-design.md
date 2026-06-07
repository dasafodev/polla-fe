# Polla Mundial 2026 — Frontend: Arquitectura, Organización e Integración (Entrega 1)

**Fecha:** 2026-06-06
**Estado:** Diseño aprobado, pendiente de revisión del spec
**Alcance de esta entrega:** Fontanería. Arquitectura, organización del proyecto e integración con el API vía mocks. **Sin estilos, sin diseño, sin layouts** — páginas crudas (HTML semántico pelado) que ejercitan la lógica y la conexión. El diseño visual es una entrega posterior.

---

## 1. Contexto y objetivo

Polla privada para el Mundial 2026, ~20 participantes, solo por invitación. Esta primera entrega del **frontend** construye la base técnica: organización del código, capa de integración con el API (cableada contra el contrato `api-contract.yaml`), y mocks con estado que permiten ejercitar toda la lógica sin backend. Cuando el backend real esté listo, se apaga el flag de mocks y el mismo código apunta a `http://localhost:3000` sin reescribir.

**No-objetivos de esta entrega:** estilos/diseño/layouts, notificaciones WhatsApp (backend), pagos, llamadas al backend real.

---

## 2. Decisiones tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Framework | **React 18 + Vite + TypeScript (strict)** | SPA mobile-first, ecosistema, swap mock→real sin fricción |
| Alcance de páginas | **Participante + Admin** (ambos como scaffolds crudos) | Deja todo el contrato visible end-to-end |
| Naturaleza de la entrega | **Lógica + conexión + organización**, sin estilos | Petición explícita del usuario |
| Login con Google | **`@react-oauth/google` (Google Identity Services)** | La más liviana; produce el ID token de Google; sin proyecto Firebase |
| Modelo de sesión | **Cookie HttpOnly + signup atómico** | Más seguro (JS no lee la cookie → resistente a XSS) e íntegro (transacción única en el registro) |
| Codegen desde el contrato | **Ninguno (todo a mano)** | Máximo control; tipos centralizados en un solo punto |
| Estado de servidor | **TanStack Query v5** | Invalidación declarativa tras mutaciones (densa en esta app), loading/error estandarizado, páginas finas |
| Mocks | **MSW con estado en memoria** | Ejercita la lógica real (candados, upserts, usos de triple, gating) |

> ⚠️ **El modelo de auth elegido SUPERSEDE la sección de auth del `api-contract.yaml`.** El contrato actual usa `bearerAuth` (JWT en header) + `AuthResponse.token` y parte el onboarding en `/auth/google` + `/auth/join` + `/auth/phone`. Este diseño lo reemplaza por **sesión en cookie HttpOnly** + **signup atómico**. El front se construye contra el modelo nuevo (definido en §7); **hay que actualizar el contrato y alinear a quien hace el backend.** Ver §13.

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
- Config por `.env`: `VITE_USE_MOCKS`, `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`.

---

## 4. Estructura del proyecto (organizada por features)

```
src/
  main.tsx                  # bootstrap: arranca MSW si VITE_USE_MOCKS, monta providers + router
  app/
    router.tsx              # definición de rutas
    providers.tsx           # GoogleOAuthProvider, QueryClientProvider, AuthProvider
    guards/                 # RequireAuth (vía GET /me), RequireAdmin
  lib/
    apiClient.ts            # fetch tipado con credentials:'include', parseo de ErrorResponse → ApiError
    errors.ts               # ApiError + códigos
    queryClient.ts          # config de TanStack Query + query keys centralizados
    clock.ts                # reloj de dev configurable (now())
    env.ts                  # lectura tipada de import.meta.env
  types/
    api.ts                  # tipos del contrato escritos a mano (única fuente FE)
    enums.ts                # roundSlug, error codes, scoring keys, status
  auth/
    google.ts               # config de GoogleOAuthProvider (clientId)
    AuthContext.tsx         # { participant, status } — sin token; la sesión vive en la cookie
    useAuth.ts
    hooks.ts                # useMe (GET /me), useLogin, useSignup, useLogout
  features/
    onboarding/             # Login (GoogleLogin), Signup (código + teléfono)
    home/                   # Dashboard
    groups/                 # GroupsList, GroupEditor, Thirds  (+ api.ts + hooks.ts)
    powerups/               # PowerupsForm  (+ api.ts + hooks.ts)
    ko/                     # KoRoundList, KoMatchDetail, BracketView (read-only), FriendsKo (+ api/hooks)
    scoreboard/             # Scoreboard, Breakdown  (+ api/hooks)
    friends/                # pronósticos de grupos/powerups de amigos (+ api/hooks)
    admin/                  # Invitations, LoadGroups, LoadKoMatches, Results, Top8, ScoringParams, Participants
  components/               # shell + nav inferior (Inicio/Predicciones/Tabla), todo crudo
  mocks/
    browser.ts              # setupWorker
    server.ts               # setupServer (tests)
    db.ts                   # estado en memoria (incluye sesiones simuladas)
    seed.ts                 # datos semilla
    handlers/
      index.ts
      auth.ts  groups.ts  ko.ts  powerups.ts  scoreboard.ts  admin.ts
```

**Convención:** cada feature trae su `api.ts` (funciones tipadas, únicos sitios que conocen rutas) y su `hooks.ts` (hooks de TanStack Query). Tipos compartidos en `types/`.

---

## 5. Capa API y tipos

### 5.1 Tipos (`types/api.ts`)
Interfaces escritas a mano que reflejan los `components/schemas` del contrato. Cada una anotada con el nombre del schema de origen. Es el **único punto** a actualizar si cambia el YAML. Incluye: `ParticipantMe`, `Invitation`, `Team`, `Group`, `GroupPrediction`, `GroupRanking`, `ThirdCandidate`, `ParticipantPredictions`, `KoMatch`, `KoTeam`, `KoResult`, `KoMyPrediction`, `KoRound`, `FriendKoPrediction`, `MyPowerups`, `PowerupTeam`, `FriendPowerups`, `ScoreboardEntry`, `ScoreBreakdown`, `ErrorResponse`. (`AuthResponse.token` ya no aplica: la sesión es cookie.)

### 5.2 Cliente (`lib/apiClient.ts`)
Un `request<T>(method, path, { body, query }): Promise<T>` que:
- antepone `VITE_API_BASE_URL`,
- envía **`credentials: 'include'`** en toda petición (el navegador adjunta la cookie de sesión automáticamente; **no hay header `Authorization`**),
- serializa/deserializa JSON,
- en respuestas no-2xx parsea `{ error, code }` y lanza **`ApiError(code, message, status)`**,
- en **401 (UNAUTHORIZED)** dispara logout central (invalida la query de `/me` y redirige a `/login`).

### 5.3 Funciones por feature (`features/*/api.ts`)
Envuelven `request<T>()` con tipos concretos. Ej.: `getGroups()`, `postGroupsPredictions(body)`, `getMyGroupPredictions()`, `getThirds()`, `postThirds(teamIds)`, `getKoMatches(roundSlug)`, `postKoPrediction(matchId, body)`, `getScoreboard()`, etc. Cobertura completa del contrato (participante + admin).

---

## 6. Estado de servidor (TanStack Query)

- **Query keys centralizados** en `lib/queryClient.ts`.
- Un hook por operación: `useMe`, `useGroups`, `useMyGroupPredictions`, `useSaveGroupPredictions`, `useThirds`, `useSaveThirds`, `usePowerups`, `useSavePowerups`, `useKoMatches(round)`, `useKoMatch(id)`, `useSaveKoPrediction`, `useFriendsGroups`, `useFriendsPowerups`, `useFriendsKo(matchId)`, `useScoreboard`, `useBreakdown(participantId)`, y los de admin.
- **Mutaciones** invalidan las queries afectadas (ej.: guardar grupo → invalida `groups/predictions/me` y `groups/thirds`; guardar KO → invalida ese partido + la ronda; login/signup/logout → invalida `me`). Optimistic update donde aporte.
- Las páginas leen el estado de candado para deshabilitar inputs, **pero el mock igual devuelve 423** si intentas guardar bloqueado, para ejercitar la ruta de error.

---

## 7. Autenticación (Google → cookie HttpOnly, signup atómico)

**Identidad:** el backend usa `google_sub` (no el email) como llave única. (Detalle de backend; lo anota el contrato actualizado.)

**Superficie de endpoints (modelo nuevo que reemplaza la sección de auth del contrato):**
- `POST /auth/signup` `{ credential, code, phone }` → el back verifica el ID token, valida el código disponible, comprueba identidad única y, **en una transacción**, crea el usuario + marca el código como usado; **setea la cookie de sesión HttpOnly** y devuelve el `participant`.
- `POST /auth/login` `{ credential }` → verifica el token, busca por `google_sub`; existe → setea cookie + devuelve `participant`; no existe → 404 ("necesitas invitación").
- `POST /auth/logout` → borra la cookie (204).
- `GET /me` → con la cookie, devuelve el `participant` (200) o 401.
- **Todos los demás endpoints** pasan a ser **protegidos por cookie** (reemplaza el `bearerAuth` global del contrato).

**Flujo en el front:**
1. App envuelta en `<GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>`.
2. Pantalla `/login`: componente **`<GoogleLogin>`** → `onSuccess` entrega `credential` (ID token).
3. `POST /auth/login { credential }`:
   - **200** → a `/` (home).
   - **404** → mostrar pantalla `Signup` con campos **código + teléfono** → `POST /auth/signup { credential, code, phone }` (se reutiliza el mismo `credential`, válido ~1h) → 200 → home.
4. Al cargar cualquier ruta protegida: `GET /me`. **200** → render; **401** → `/login`. Esto **rehidrata la sesión sin guardar nada sensible en el cliente** (elimina el hack de `localStorage` que tenía el diseño anterior).
5. **Logout:** botón → `POST /auth/logout` → invalida `me` → `/login`.

**Notas:**
- `AuthContext` cachea solo el `participant` (de `GET /me`); **no guarda token**.
- Con signup atómico **no hay usuarios "en limbo"** (joined sin teléfono): un usuario o existe completo o no existe. Por eso los flags `hasJoined`/`hasPhone` dejan de usarse para routing.
- La UI puede mantener el código y el teléfono en una sola pantalla cruda de signup, o en dos pasos que recolectan y **envían una sola vez** (la llamada al API es atómica de cualquier forma).
- **Dev bypass (opcional, tras flag):** en modo mocks, un atajo que establece sesión para un usuario elegido (participante o admin) sin round-trip a Google. El camino real de GIS queda igualmente cableado.

---

## 8. Routing y guards

- **Público:** `/login` y la pantalla de `Signup` (se muestra cuando `/auth/login` devuelve 404).
- **`RequireAuth`:** hace `GET /me`; 200 → deja pasar; 401 → `/login`. (No hay guard de onboarding progresivo: el signup es atómico.)
- **Participante:** `/` (Dashboard), `/predicciones` (hub con tarjetas crudas), `/predicciones/grupos`, `/predicciones/grupos/:groupId`, `/predicciones/terceros`, `/predicciones/powerups`, `/predicciones/revisar`, `/eliminatorias`, `/eliminatorias/:round`, `/eliminatorias/partido/:matchId`, `/tabla`, `/tabla/:participantId` (breakdown), `/amigos/*`.
- **`RequireAdmin`** (`role === 'admin'`): `/admin`, `/admin/invitaciones`, `/admin/grupos`, `/admin/partidos`, `/admin/resultados`, `/admin/top8`, `/admin/parametros`, `/admin/participantes`.
- **Nav inferior** crudo: Inicio / Predicciones / Tabla.
- **Bracket:** listas anidadas read-only (la versión visual real queda para diseño).

---

## 9. Mocks con estado (MSW) — el corazón de la entrega

### 9.1 Estado (`db.ts`)
Estructuras en memoria: `participants` (con `google_sub`), `sessions` (sesión simulada: ver 9.5), `invitations`, `teams`, `groups`, `groupPredictions` (por participante+grupo), `thirdsSelections`, `powerups`, `koRounds`, `koMatches`, `koPredictions`, `scoringParams`, `tripleUses` (por participante).

### 9.2 Semilla (`seed.ts`)
- 12 grupos A–L con 48 equipos (datos ilustrativos), flags `isTop8`.
- 8 equipos marcados `isTop8`.
- `scoringParams` por defecto (todas las keys del contrato).
- Un participante **admin** (con su `google_sub`) + varios participantes de prueba ya registrados.
- Códigos de invitación (disponible / usado / expirado).
- Ronda **r32** sembrada con partidos para probar KO.

### 9.3 Lógica que los handlers honran
- **`/auth/signup`**: verifica credential (401 si inválido), valida código (404 no encontrado / 409 usado / expirado), identidad única por `google_sub` (409 si ya existe), valida teléfono E.164 (400); transacción simulada: crea participante + marca código usado + establece sesión.
- **`/auth/login`**: busca por `google_sub` → 200 + sesión, o 404 ("necesitas invitación").
- **`/auth/logout`**: limpia la sesión (204). **`GET /me`**: devuelve el participante de la sesión (200) o 401.
- **Grupos** (`POST /groups/predictions`): upsert por grupo; **candado global** (now ≥ 11-jun → 423 `PREDICTIONS_LOCKED`); valida rankings (4 posiciones, sin duplicados, equipos del grupo → 400 `INVALID_RANKINGS`).
- **Terceros** (`/groups/thirds`): deriva candidatos desde la posición 3 de cada grupo completo; `POST` exige exactamente 8 candidatos válidos (400 `INVALID_THIRDS_COUNT` / `INVALID_THIRD_CANDIDATE`); candado.
- **Powerups**: `darkHorse` debe ser `isTop8:false`, `disappointment` `isTop8:true` (400); 409 si ya existen (POST) / 404 si no (PUT); candado.
- **KO** (`GET /ko/matches`): por `roundSlug`; calcula `lockedAt = scheduledAt − 30min`, `lockedIn = now ≥ lockedAt`; incluye `result` y `myPrediction`.
- **KO predicciones** (`POST`/`PUT`): candado (`now < lockedAt` → 423 `MATCH_LOCKED`), `teamAdvancesId` válido (400), usos de triple (máx 3 → 400 `TRIPLE_USES_EXHAUSTED`), 409 si ya existe (POST) / 404 si no (PUT), 423 si `finished`.
- **Amigos** (grupos/powerups): `available` solo si `now ≥ scheduledAt` del primer partido; KO: `now ≥ scheduledAt` del partido. Si no, `available:false` + `availableAt`.
- **Scoreboard / breakdown**: cómputo simple desde `scoringParams` (o estático razonable); `prize` para rank 1/2/3 (700000/250000/50000).
- **Admin**: invitaciones (crear/listar), cargar grupos (409 si existen), cargar partidos KO por ronda, cargar/corregir resultado, top8, scoring-params, participantes. Protegidos por sesión + rol admin (403 si no).

### 9.4 Reloj de dev (`lib/clock.ts`, fuente única de `now()`)
Un `now()` mutable, **única fuente de verdad** importada tanto por los handlers de MSW como por los checks de candado del front (así ambos coinciden), para simular "antes/después del 11-jun" y candados de partidos sin esperar fechas reales. Control crudo (input simple en una página de dev + función expuesta en consola). Nota: hoy es 2026-06-06, así que por defecto los grupos están **abiertos** y el torneo **no ha iniciado**.

### 9.5 Sesión simulada (matiz importante)
MSW **no puede** dar semántica HttpOnly real del navegador (el `Set-Cookie` de una respuesta del service worker no entra al cookie jar). Se simula la sesión con un **estado en memoria** en `db.sessions` (el mock "recuerda" quién inició sesión). Lo relevante: **el código del front es idéntico al de producción** — usa `credentials:'include'` y `GET /me`, nunca lee la cookie. Solo el mock finge la cookie. Así la fidelidad del *contrato* del front se conserva y al conectar el back real funciona sin cambios.

---

## 10. Manejo de errores

`ApiError` con `code`. Los componentes muestran el `error` (en español del contrato) en texto crudo. **401** → logout + redirect a `/login`; **403** → mensaje de acceso denegado; **423** → mensaje de candado inline + inputs deshabilitados; **400/404/409** → mensaje inline. Sin estilos.

Códigos relevantes a manejar: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_GOOGLE_TOKEN`, `INVITE_NOT_FOUND`, `INVITE_ALREADY_USED`, `INVALID_PHONE`, `PHONE_ALREADY_EXISTS`, `USER_ALREADY_EXISTS` (identidad duplicada en signup — código nuevo propuesto), `USER_NOT_FOUND` (login sin cuenta — código nuevo propuesto), `PREDICTIONS_LOCKED`, `INVALID_RANKINGS`, `INVALID_THIRD_CANDIDATE`, `INVALID_THIRDS_COUNT`, `INVALID_DARK_HORSE`, `INVALID_DISAPPOINTMENT`, `POWERUPS_ALREADY_EXISTS`, `POWERUPS_NOT_FOUND`, `MATCH_LOCKED`, `MATCH_FINISHED`, `INVALID_TEAM_ADVANCES`, `TRIPLE_USES_EXHAUSTED`, `PREDICTION_ALREADY_EXISTS`, `PREDICTION_NOT_FOUND`, `MATCH_NOT_FOUND`, `ROUND_NOT_FOUND`, `PARAM_NOT_FOUND`, `GROUPS_ALREADY_LOADED`, `PARTICIPANT_NOT_FOUND`.

---

## 11. Testing

Vitest + RTL + MSW (server de node, **mismos handlers**). Ramas críticas a cubrir:
- **Auth:** login existente (200→home); login sin cuenta (404→signup); signup atómico (código inválido/usado, identidad duplicada, teléfono inválido); rehidratación vía `GET /me` (200/401); logout.
- Enforcement de candados (grupos 423 con reloj avanzado; KO `MATCH_LOCKED`).
- Derivación de candidatos a tercero desde posición 3 + exigencia de 8.
- Elegibilidad de powerups por `isTop8`.
- Decremento de usos de triple (máx 3, `TRIPLE_USES_EXHAUSTED`).
- Gating de amigos por `scheduledAt`.
- `RequireAdmin` (403 a no-admin).

Durante la implementación se trabaja con **TDD**.

---

## 12. Configuración (`.env`)

```
VITE_USE_MOCKS=true
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=<oauth-client-id>
```
`.env.example` versionado. README con instrucciones de arranque.

**En producción** (cookie): el back debe enviar la cookie con `HttpOnly; Secure; SameSite`. Si front y back están en dominios distintos → `SameSite=None; Secure` + **CORS con credenciales** (`Access-Control-Allow-Credentials: true` y origin explícito). El `GOOGLE_CLIENT_ID` y el secreto para firmar el JWT de sesión van en variables de entorno del back, nunca en el código.

---

## 13. Supuestos y riesgos

1. **El modelo de auth reemplaza la sección de auth del contrato.** Cookie HttpOnly + signup atómico + `GET /me` + `/auth/logout`, y todos los endpoints pasan a estar protegidos por cookie (no `bearerAuth`). **Hay que actualizar `api-contract.yaml` y alinear al backend.** (El front se construye contra el modelo de §7.)
2. **Verificación del token en el back:** debe verificar un **ID token de Google** (`google-auth-library`, `verifyIdToken`), consistente con `@react-oauth/google`. Identidad por `google_sub`.
3. **Mock no da HttpOnly real:** se simula la sesión en memoria (§9.5). El código del front es igual al de producción.
4. **CORS con credenciales en prod** si front/back están en dominios distintos (en dev: `5173` vs `3000`).
5. **Datos semilla ilustrativos:** los 12 grupos/48 equipos del mock no pretenden ser el sorteo oficial; sirven para ejercitar la lógica.
6. **Mantenimiento manual de tipos:** al ser "todo a mano", `types/api.ts` debe actualizarse si cambia el contrato.

---

## 14. Criterios de éxito de la entrega

- El proyecto arranca con `VITE_USE_MOCKS=true` y se puede recorrer **todo el flujo** (login/signup → grupos → terceros → powerups → revisar → eliminatorias → tabla → amigos → admin) sobre páginas crudas.
- Toda la lógica de negocio (auth con cookie+signup atómico, candados, upserts, terceros, powerups, triple, gating) queda **ejercitada y probada** vía mocks + tests.
- Apagar `VITE_USE_MOCKS` apunta al backend real sin cambios de código.
- Cero estilos: HTML crudo en todas las páginas.
```
