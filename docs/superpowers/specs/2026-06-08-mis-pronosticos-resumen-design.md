# Resumen de pronósticos (Mis Pronósticos) — Diseño

**Fecha:** 2026-06-08
**Estado:** Aprobado (brainstorming) — pendiente plan de implementación

## Contexto y problema

Hoy `/predicciones` muestra el `Hub`: un checklist de pasos (grupos / terceros / powerups)
con barra de progreso, más un `Revisar todo` (`/predicciones/revisar`, componente `Review`)
que solo lista conteos secos (`12/12 completos`, etc.). No existe una forma compacta de **ver
todos los pronósticos hechos** ni de **ver los puntos acumulados por fase** una vez arranca el
torneo.

Queremos una pantalla de resumen compacta, dividida en tabs por fase, que sirva como **pantalla
principal de Predicciones** tanto antes del cierre (para completar/editar) como después (para
revisar pronósticos y puntajes). Editar sigue ocurriendo en las vistas/editor que ya existen.

## Objetivos

- Pantalla principal de `/predicciones` = resumen tabbed por fase.
- Ver **todos** los pronósticos de un vistazo, agrupados por fase.
- Ver **puntos acumulados por fase** (y total global) cuando hay resultados.
- Tocar cualquier ítem abre el **editor existente** (sin reimplementar edición).
- Funciona en dos estados: pre-cierre (editable, sin puntos) y con-resultados (lectura + aciertos).

## No-objetivos

- No rediseñar los editores (`GroupDeck`/`GroupsEditor`, `Thirds`, `Powerups`, `KoMatchDetail`).
- No tocar el motor de scoring ni el scoreboard.
- No deep-link a un grupo específico dentro del deck de grupos (mejora opcional, ver abajo).

## Decisiones de brainstorming (cerradas)

1. **Ubicación:** el resumen tabbed **reemplaza al Hub** como pantalla principal de `/predicciones`.
   Editar = tocar una fila/fase → abre el editor existente.
2. **Estructura de tabs:** 4 tabs fijas — **Grupos · Terceros · Eliminatorias · Powerups**.
   Las rondas KO son **secciones dentro** de Eliminatorias (no una tab por ronda).
3. **Densidad de Grupos:** mini-tarjeta por grupo (orden completo 1-4 con bandera + nombre),
   no la línea ultra-densa.
4. **Marcado de aciertos (grupos):** se mantiene **mi orden pronosticado** (1→4) y cada fila se
   tiñe según acierto: **verde = exacto**, **ámbar = parcial**. (En grupos los 4 equipos siempre
   están en el resultado real ⇒ solo hay exacto o parcial, nunca "falló".)

Mockups de referencia (persisten en `.superpowers/brainstorm/.../content/`):
`tabs-structure.html`, `grupos-density.html`, `grupos-marking.html`, `all-tabs.html`.

## Arquitectura

### Pantalla `MisPronosticos`

Reemplaza a `Hub` en la ruta `/predicciones`.

- **Header:** título "Predicciones". A la derecha:
  - Cerrado/con torneo iniciado → chip con **total global** de puntos (de `breakdown.total`).
  - Antes del cierre → **% de avance** (reutiliza `useOnboardingState().percent`).
- **Tabs:** `Grupos · Terceros · Eliminatorias · Powerups`. La tab activa se guarda en el query
  param `?tab=grupos|terceros|eliminatorias|powerups` (default `grupos`) para que sea linkeable y
  respete back/forward.
- **Cuerpo:** renderiza el panel de la tab activa.

### Fuente de los totales

Los **subtotales por fase** y el **total global** salen del endpoint de breakdown del usuario
actual (`useBreakdown(participant.id)` → `ScoreBreakdown`), la misma fuente que alimenta el
scoreboard. Mapeo:

- Grupos → `breakdown.groups`
- Terceros → `breakdown.thirds`
- Eliminatorias → `breakdown.ko`
- Powerups → `breakdown.darkHorse + breakdown.disappointment`
- Total global (header) → `breakdown.total`

Los **puntos por ítem** (por grupo, por partido, etc.) salen del `pointsEarned` que ya devuelve
cada endpoint de fase.

Antes de que haya resultados, `breakdown.total` es 0; por eso el header muestra **% de avance** y
no "0 pts". El marcado/puntos por ítem aparece por-ítem en cuanto ese ítem tiene resultado
(`pointsEarned`/`result` presente).

## Especificación por tab

### 1. Grupos (`GruposPanel`)

- **Datos:** `useMyGroupPredictions()` → `MyGroupPredictions { data: GroupPrediction[], completedGroups }`.
- **Subtotal de fase (header derecho):** `breakdown.groups` cuando hay resultados; si no, `N/12 completos`.
- **Ítem:** una mini-tarjeta por grupo (12). Cabecera: `Grupo X` + chip de puntos del grupo
  (`pointsEarned.total`) cuando exista. Cuatro filas en **mi orden pronosticado** (posición en
  círculo, bandera, nombre).
  - Pre-resultados: top-2 resaltados (clasifican según mi pronóstico), sin tinte de acierto.
  - Con resultados: cada fila tiñe **verde (exacto)** / **ámbar (parcial)** con etiqueta `EXACTO`/`PARCIAL`.
  - Incompleto (`groupComplete === false`): estado "Sin ordenar" + CTA que abre el editor.
- **Editar (tap):** navega a `/predicciones/grupos`.
- **Cambio de contrato necesario** (ver sección Contrato): cada `GroupRanking` debe traer
  `result: 'exact' | 'partial' | null`.

### 2. Terceros (`TercerosPanel`)

- **Datos:** `useThirds()` → `ThirdsResponse { data: ThirdCandidate[], selectedCount }`.
- **Subtotal de fase:** `breakdown.thirds` cuando hay resultados; si no, `N/8 elegidos`.
- **Ítem:** lista de los elegidos (`selected === true`), cada uno con bandera + nombre + label de
  grupo de origen.
  - Con resultados (`pointsEarned !== null`): acertó (`pts_third_correct > 0`) → verde `3° ✓`;
    si no → ámbar `no clasificó`.
  - Incompleto (`selectedCount < 8`): banner de progreso + CTA al editor.
- **Sin cambio de contrato:** la corrección se deriva de `ThirdCandidate.pointsEarned`.
- **Editar (tap):** navega a `/predicciones/terceros`.

### 3. Eliminatorias (`EliminatoriasPanel`)

- **Datos:** las 6 rondas KO. Nuevo hook agregador `useAllKoPredictions()` que dispara
  `useKoMatches(slug)` para `['r32','r16','qf','sf','3rd','final']` (orden por `KoRound.order`).
- **Subtotal de fase:** `breakdown.ko`. **Subtotal por ronda:** suma de `pointsEarned.total` de
  los partidos de esa ronda.
- **Layout:** una **sección por ronda** (cabecera con nombre de ronda + subtotal de ronda),
  recorrible con scroll dentro de la tab. Una fila por partido:
  - Marcador pronosticado + equipo que avanza + badge `×3` si `tripleActive`.
  - Con resultado (`match.result`): marcador real + marcas de acierto:
    - avanza acertado → `pts_ko_advances > 0` (verde "Avanza X ✓")
    - marcador exacto → `pts_ko_exact_score > 0`
    - bono triple → `mult_triple > 0`
  - Puntos del partido = `myPrediction.pointsEarned.total`.
  - Partidos sin equipos asignados aún (`homeTeam`/`awayTeam` null) usan `homeTeamLabel`/`awayTeamLabel`.
  - Sin pronóstico (`myPrediction === null`): estado "Sin pronóstico" + CTA.
- **Sin cambio de contrato:** todo se deriva de `KoMatch.myPrediction.pointsEarned` y `KoMatch.result`.
- **Editar (tap):** navega a `/eliminatorias/partido/:matchId` (`KoMatchDetail`, editor existente).

### 4. Powerups (`PowerupsPanel`)

- **Datos:** `usePowerups()` → `MyPowerups { darkHorse, disappointment, pointsEarned }`.
- **Subtotal de fase:** `breakdown.darkHorse + breakdown.disappointment`.
- **Ítem:** dos tarjetas.
  - **Caballo oscuro:** equipo + `dark_horse_rounds_advanced` rondas + `pts_dark_horse_per_round` (≥0, verde).
  - **La decepción:** equipo + rondas + `pts_disappointment_per_round` (≤0, naranja/lock).
  - Sin elegir: estado vacío + CTA.
- **Sin cambio de contrato.**
- **Editar (tap):** navega a `/predicciones/powerups`.

## Cambio de contrato (único)

Exponer el acierto por equipo en grupos, hoy no disponible (el endpoint solo manda puntos agregados).

- **Tipo** (`src/types/api.ts`): `GroupRanking` añade
  `result: 'exact' | 'partial' | null`.
- **Handler** (`src/mocks/handlers/groups.ts`, `GET /api/groups/predictions/me`): en
  `serializeRankings`, cuando exista `db.officialGroupStandings[groupId]`, calcular por equipo
  `exact` si la posición real == pronosticada, si no `partial`; `null` cuando aún no hay standings
  oficiales del grupo. (La lógica ya existe en `computeGroupPoints`; se reutiliza/espeja.)
- **Tests:** actualizar `src/mocks/handlers/groups.test.ts` y cualquier fixture afectado.

Terceros, Eliminatorias y Powerups **no** requieren cambios de contrato.

## Estados

- **Pre-cierre (editable):** sin marcas ni puntos. Cada tab muestra el pronóstico y, donde falte,
  un "completar" que abre el editor. Header con % de avance. Los editores ya permiten editar.
- **Cerrado / con resultados (lectura):** marcas verde/ámbar y puntos por ítem/fase + total global.
  Los editores ya respetan `locked` (solo lectura), así que tocar un ítem cerrado abre su detalle
  en modo lectura.
- El estado de cierre se deriva de `useOnboardingState().locked` (mismo criterio que usa `Hub`/`GroupDeck`).

## Rutas y limpieza

- `/predicciones` → `MisPronosticos` (antes `Hub`).
- Se **eliminan** `Hub` (`src/features/predicciones/Hub.tsx`) y la ruta `/predicciones/revisar`
  con su componente `Review` (`src/features/predicciones/Review.tsx`), ya subsumidos. Quitar sus
  imports del router.
- Editores intactos: `/predicciones/grupos`, `/predicciones/terceros`, `/predicciones/powerups`,
  `/eliminatorias/partido/:matchId`.

## Componentes y archivos

Nuevos, en `src/features/predicciones/`:

- `MisPronosticos.tsx` — pantalla: header (total/avance) + tabs (`?tab=`) + panel activo.
- `GruposPanel.tsx` — mini-tarjetas de grupos (+ posible `GroupSummaryCard` interno).
- `TercerosPanel.tsx` — lista de 8 elegidos.
- `EliminatoriasPanel.tsx` — secciones por ronda + filas de partido.
- `PowerupsPanel.tsx` — dos tarjetas.
- `hooks.ts` (o ampliar el existente): `useAllKoPredictions()` (fan-out 6 rondas) y `useMyTotals()`
  (wrapper de breakdown del usuario actual para header + subtotales).

Reutiliza primitivos existentes: `Card`, `Chip`, `Flag`, `Avatar`, tokens de `theme.css`,
iconos de `@phosphor-icons/react`.

## Testing

- `MisPronosticos.test.tsx`: cambio de tab vía `?tab=`; header muestra % de avance vs total según `locked`.
- `GruposPanel.test.tsx`: renderiza 12 tarjetas en mi orden; tinte exacto/parcial cuando hay
  `result`; subtotal; estado "sin ordenar"; navega al editor al tocar.
- `TercerosPanel.test.tsx`: 8 elegidos; verde "acertó" vs ámbar "no clasificó"; subtotal; estado `<8`.
- `EliminatoriasPanel.test.tsx`: secciones por ronda; fila con marcador real + marcas; subtotal por
  ronda; trae las 6 rondas (mock); navega a `KoMatchDetail`.
- `PowerupsPanel.test.tsx`: dos tarjetas; signo +/−; total.
- `src/mocks/handlers/groups.test.ts`: nuevo campo `result` en `/me`.
- Actualizar `scripts/dev-smoke.mjs` si recorre `/predicciones`.

Seguir patrones de tests existentes (`Dashboard.test.tsx`, `Scoreboard.test.tsx`).

## Mejora opcional (fuera de alcance inicial)

- Deep-link de edición a un grupo concreto: `GroupDeck` aceptaría `?group=<label>` para abrir en ese
  índice. Por ahora el tap a un grupo abre el deck en el primer grupo.

## Riesgos / notas

- **Fan-out KO (6 queries):** aceptable; React Query cachea por ronda. Si molesta, un endpoint
  agregado sería futura optimización (no requerido).
- **Coherencia de totales:** usar breakdown como fuente única evita discrepancias con el scoreboard;
  los puntos por ítem provienen de los mismos cálculos del mock, así que deben cuadrar con los subtotales.
