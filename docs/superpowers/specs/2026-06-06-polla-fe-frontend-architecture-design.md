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
| Autenticación | **`@react-oauth/google` (Google Identity Services)** | La más liviana; produce el ID token de Google que el contrato pide literal; sin proyecto Firebase |
| Codegen desde el contrato | **Ninguno (todo a mano)** | Máximo control; tipos centralizados en un solo punto |
| Estado de servidor | **TanStack Query v5** | Invalidación declarativa tras mutaciones (densa en esta app), loading/error estandarizado, páginas finas |
| Mocks | **MSW con estado en memoria** | Ejercita la lógica real (candados, upserts, usos de triple, gating) |

**Supuesto a confirmar con el backend:** el back emite **su propio JWT (45 días)** tras verificar el ID token de Google; ese JWT es el `Bearer` de todas las demás llamadas. No se reusa el token de Google en cada request. (Es lo que dice el contrato: `AuthResponse.token` + `bearerAuth`.)

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
    guards/                 # RequireAuth, RequireOnboarded, RequireAdmin
  lib/
    apiClient.ts            # fetch tipado, inyección de Bearer, parseo de ErrorResponse → ApiError
    errors.ts               # ApiError + códigos
    queryClient.ts          # config de TanStack Query + query keys centralizados
    clock.ts                # reloj de dev configurable (now())
    env.ts                  # lectura tipada de import.meta.env
  types/
    api.ts                  # tipos del contrato escritos a mano (única fuente FE)
    enums.ts                # roundSlug, error codes, scoring keys, status
  auth/
    google.ts               # config de GoogleOAuthProvider (clientId)
    AuthContext.tsx         # { token, participant, status }, persistido en localStorage
    useAuth.ts
    hooks.ts                # useGoogleLogin (credential→/auth/google), useJoin, usePhone, useLogout
  features/
    onboarding/             # Login, JoinCode, Phone
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
    db.ts                   # estado en memoria
    seed.ts                 # datos semilla
    handlers/
      index.ts
      auth.ts  groups.ts  ko.ts  powerups.ts  scoreboard.ts  admin.ts
```

**Convención:** cada feature trae su `api.ts` (funciones tipadas, únicos sitios que conocen rutas) y su `hooks.ts` (hooks de TanStack Query). Tipos compartidos en `types/`.

---

## 5. Capa API y tipos

### 5.1 Tipos (`types/api.ts`)
Interfaces escritas a mano que reflejan los `components/schemas` del contrato. Cada una anotada con el nombre del schema de origen. Es el **único punto** a actualizar si cambia el YAML. Incluye: `ParticipantMe`, `AuthResponse`, `Invitation`, `Team`, `Group`, `GroupPrediction`, `GroupRanking`, `ThirdCandidate`, `ParticipantPredictions`, `KoMatch`, `KoTeam`, `KoResult`, `KoMyPrediction`, `KoRound`, `FriendKoPrediction`, `MyPowerups`, `PowerupTeam`, `FriendPowerups`, `ScoreboardEntry`, `ScoreBreakdown`, `ErrorResponse`.

### 5.2 Cliente (`lib/apiClient.ts`)
Un `request<T>(method, path, { body, query }): Promise<T>` que:
- antepone `VITE_API_BASE_URL`,
- inyecta `Authorization: Bearer <token>` desde el store de auth,
- serializa/deserializa JSON,
- en respuestas no-2xx parsea `{ error, code }` y lanza **`ApiError(code, message, status)`**,
- en **401 (UNAUTHORIZED)** dispara logout central (limpia sesión).

### 5.3 Funciones por feature (`features/*/api.ts`)
Envuelven `request<T>()` con tipos concretos. Ej.: `getGroups()`, `postGroupsPredictions(body)`, `getMyGroupPredictions()`, `getThirds()`, `postThirds(teamIds)`, `getKoMatches(roundSlug)`, `postKoPrediction(matchId, body)`, `getScoreboard()`, etc. Cobertura completa del contrato (participante + admin).

---

## 6. Estado de servidor (TanStack Query)

- **Query keys centralizados** en `lib/queryClient.ts`.
- Un hook por operación: `useGroups`, `useMyGroupPredictions`, `useSaveGroupPredictions`, `useThirds`, `useSaveThirds`, `usePowerups`, `useSavePowerups`, `useKoMatches(round)`, `useKoMatch(id)`, `useSaveKoPrediction`, `useFriendsGroups`, `useFriendsPowerups`, `useFriendsKo(matchId)`, `useScoreboard`, `useBreakdown(participantId)`, y los de admin.
- **Mutaciones** invalidan las queries afectadas (ej.: guardar grupo → invalida `groups/predictions/me` y `groups/thirds`; guardar KO → invalida ese partido + la ronda). Optimistic update donde aporte.
- Las páginas leen el estado de candado para deshabilitar inputs, **pero el mock igual devuelve 423** si intentas guardar bloqueado, para ejercitar la ruta de error.

---

## 7. Autenticación (Google Identity Services → JWT del back)

- App envuelta en `<GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>`.
- **Login:** se usa el componente **`<GoogleLogin>`**, cuyo `onSuccess` entrega `credentialResponse.credential` = **ID token de Google (JWT)**. Ese token va en `POST /auth/google { credential }`.
- Respuesta: `{ token, participant }`. Se guarda en `AuthContext` + `localStorage`. El `token` (JWT del back) es el `Bearer` de aquí en adelante.
- **Redirección post-login** según `participant`: `!hasJoined` → código; `hasJoined && !hasPhone` → teléfono; ambos → home.
- **Join:** `POST /auth/join { code }` → `participant.hasJoined = true`. **Phone:** `POST /auth/phone { phone }` (valida E.164) → `participant.hasPhone = true`.
- **Logout:** limpia token + participant del store y `localStorage`.
- **Gap del contrato:** no existe `GET /me`. Se rehidrata `participant` desde `localStorage` (se actualiza tras join/phone). En 401 se limpia. Señalado por si el back agrega `/me` luego.
- **Dev bypass (opcional, tras flag):** en modo mocks, un atajo que manda un `credential` falso directo al mock para iterar sin round-trip a Google. El camino real de GIS queda igualmente cableado.

---

## 8. Routing y guards

- **Público:** `/login`.
- **`RequireAuth`:** exige `token`; si no, → `/login`.
- **`RequireOnboarded`:** `!hasJoined` → `/onboarding/codigo`; `hasJoined && !hasPhone` → `/onboarding/telefono`.
- **Participante:** `/` (Dashboard), `/predicciones` (hub con tarjetas crudas), `/predicciones/grupos`, `/predicciones/grupos/:groupId`, `/predicciones/terceros`, `/predicciones/powerups`, `/predicciones/revisar`, `/eliminatorias`, `/eliminatorias/:round`, `/eliminatorias/partido/:matchId`, `/tabla`, `/tabla/:participantId` (breakdown), `/amigos/*`.
- **`RequireAdmin`** (`role === 'admin'`): `/admin`, `/admin/invitaciones`, `/admin/grupos`, `/admin/partidos`, `/admin/resultados`, `/admin/top8`, `/admin/parametros`, `/admin/participantes`.
- **Nav inferior** crudo: Inicio / Predicciones / Tabla.
- **Bracket:** listas anidadas read-only (la versión visual real queda para diseño).

---

## 9. Mocks con estado (MSW) — el corazón de la entrega

### 9.1 Estado (`db.ts`)
Estructuras en memoria: `participants`, `invitations`, `teams`, `groups`, `groupPredictions` (por participante+grupo), `thirdsSelections`, `powerups`, `koRounds`, `koMatches`, `koPredictions`, `scoringParams`, `tripleUses` (por participante).

### 9.2 Semilla (`seed.ts`)
- 12 grupos A–L con 48 equipos (datos ilustrativos), flags `isTop8`.
- 8 equipos marcados `isTop8`.
- `scoringParams` por defecto (todas las keys del contrato).
- Un participante **admin** + varios participantes de prueba.
- Códigos de invitación (disponible / usado / expirado).
- Ronda **r32** sembrada con partidos para probar KO.

### 9.3 Lógica que los handlers honran
- **`/auth/google`**: find-or-create por email del credential decodificado → 200 (login) vs 201 (signup).
- **`/auth/join`**: valida código (no encontrado=404, usado=409, expirado), lo marca usado, set `hasJoined`.
- **`/auth/phone`**: valida formato E.164 (400) y unicidad (409), set `hasPhone`.
- **Grupos** (`POST /groups/predictions`): upsert por grupo; **candado global** (now ≥ 11-jun → 423 `PREDICTIONS_LOCKED`); valida rankings (4 posiciones, sin duplicados, equipos del grupo → 400 `INVALID_RANKINGS`).
- **Terceros** (`/groups/thirds`): deriva candidatos desde la posición 3 de cada grupo completo; `POST` exige exactamente 8 candidatos válidos (400 `INVALID_THIRDS_COUNT` / `INVALID_THIRD_CANDIDATE`); candado.
- **Powerups**: `darkHorse` debe ser `isTop8:false`, `disappointment` `isTop8:true` (400); 409 si ya existen (POST) / 404 si no (PUT); candado.
- **KO** (`GET /ko/matches`): por `roundSlug`; calcula `lockedAt = scheduledAt − 30min`, `lockedIn = now ≥ lockedAt`; incluye `result` y `myPrediction`.
- **KO predicciones** (`POST`/`PUT`): candado (`now < lockedAt` → 423 `MATCH_LOCKED`), `teamAdvancesId` válido (400), usos de triple (máx 3 → 400 `TRIPLE_USES_EXHAUSTED`), 409 si ya existe (POST) / 404 si no (PUT), 423 si `finished`.
- **Amigos** (grupos/powerups): `available` solo si `now ≥ scheduledAt` del primer partido; KO: `now ≥ scheduledAt` del partido. Si no, `available:false` + `availableAt`.
- **Scoreboard / breakdown**: cómputo simple desde `scoringParams` (o estático razonable); `prize` para rank 1/2/3 (700000/250000/50000).
- **Admin**: invitaciones (crear/listar), cargar grupos (409 si existen), cargar partidos KO por ronda, cargar/corregir resultado, top8, scoring-params, participantes.

### 9.4 Reloj de dev (`lib/clock.ts`, fuente única de `now()`)
Un `now()` mutable, **única fuente de verdad** importada tanto por los handlers de MSW como por los checks de candado del front (así ambos coinciden), para simular "antes/después del 11-jun" y candados de partidos sin esperar fechas reales. Control crudo (input simple en una página de dev + función expuesta en consola). Nota: hoy es 2026-06-06, así que por defecto los grupos están **abiertos** y el torneo **no ha iniciado**.

---

## 10. Manejo de errores

`ApiError` con `code`. Los componentes muestran el `error` (ya viene en español del contrato) en texto crudo. **401** → logout + redirect a `/login`; **423** → mensaje de candado inline + inputs deshabilitados; **400/404/409** → mensaje inline. Sin estilos.

Códigos relevantes a manejar: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `INVALID_GOOGLE_TOKEN`, `INVITE_NOT_FOUND`, `INVITE_ALREADY_USED`, `INVALID_PHONE`, `PHONE_ALREADY_EXISTS`, `PREDICTIONS_LOCKED`, `INVALID_RANKINGS`, `INVALID_THIRD_CANDIDATE`, `INVALID_THIRDS_COUNT`, `INVALID_DARK_HORSE`, `INVALID_DISAPPOINTMENT`, `POWERUPS_ALREADY_EXISTS`, `POWERUPS_NOT_FOUND`, `MATCH_LOCKED`, `MATCH_FINISHED`, `INVALID_TEAM_ADVANCES`, `TRIPLE_USES_EXHAUSTED`, `PREDICTION_ALREADY_EXISTS`, `PREDICTION_NOT_FOUND`, `MATCH_NOT_FOUND`, `ROUND_NOT_FOUND`, `PARAM_NOT_FOUND`, `GROUPS_ALREADY_LOADED`, `PARTICIPANT_NOT_FOUND`.

---

## 11. Testing

Vitest + RTL + MSW (server de node, **mismos handlers**). Ramas críticas a cubrir:
- Routing de onboarding (3 ramas: sin join, con join sin phone, completo).
- Enforcement de candados (grupos 423 con reloj avanzado; KO `MATCH_LOCKED`).
- Derivación de candidatos a tercero desde posición 3 + exigencia de 8.
- Elegibilidad de powerups por `isTop8`.
- Decremento de usos de triple (máx 3, `TRIPLE_USES_EXHAUSTED`).
- Gating de amigos por `scheduledAt`.

Durante la implementación se trabaja con **TDD**.

---

## 12. Configuración (`.env`)

```
VITE_USE_MOCKS=true
VITE_API_BASE_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=<oauth-client-id>
```
`.env.example` versionado. README con instrucciones de arranque.

---

## 13. Supuestos y riesgos

1. **Token model:** el back emite su propio JWT (45d) tras verificar el ID token de Google; ese JWT es el Bearer. (Confirmar con backend.)
2. **No hay `GET /me`:** se rehidrata `participant` desde `localStorage`. Si el back agrega `/me`, se ajusta.
3. **Verificación del token en el back:** debe verificar un **ID token de Google** (`google-auth-library`), consistente con `@react-oauth/google`. (Confirmar con backend.)
4. **Datos semilla ilustrativos:** los 12 grupos/48 equipos del mock no pretenden ser el sorteo oficial; sirven para ejercitar la lógica.
5. **Mantenimiento manual de tipos:** al ser "todo a mano", `types/api.ts` debe actualizarse si cambia el contrato.

---

## 14. Criterios de éxito de la entrega

- El proyecto arranca con `VITE_USE_MOCKS=true` y se puede recorrer **todo el flujo** (onboarding → grupos → terceros → powerups → revisar → eliminatorias → tabla → amigos → admin) sobre páginas crudas.
- Toda la lógica de negocio (candados, upserts, terceros, powerups, triple, gating) queda **ejercitada y probada** vía mocks + tests.
- Apagar `VITE_USE_MOCKS` apunta al backend real sin cambios de código.
- Cero estilos: HTML crudo en todas las páginas.
```
