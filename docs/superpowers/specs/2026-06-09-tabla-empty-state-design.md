# Estado vacío de la Tabla — diseño

Fecha: 2026-06-09
Componente: `src/features/scoreboard/Scoreboard.tsx` (`ScoreboardEmpty`)

## Problema

El estado vacío de la Tabla hoy es una tarjeta plana con título y una línea
("La tabla se llena cuando empiecen los partidos"). Es pobre comparado con el
resto de la app, que ya tiene un lenguaje rico (header navy, motion, FunFactCard,
`EmptyHome`). El estado vacío aparece **antes de que se juegue el primer partido**,
cuando nadie tiene puntos.

El disparador actual es `data.length === 0 || allZero`. En la práctica el caso
real es `allZero`: el endpoint **sí trae el roster** de jugadores inscritos, todos
con `total: 0`. Hoy ese roster se desperdicia.

## Objetivo

Convertir el estado vacío en una **previsualización del roster "Todos en 0"**: que
el jugador vea contra quién compite y sienta que la pantalla está viva antes de
arrancar, sin inventar un ranking que no existe.

## Diseño

Dos renders según los datos:

### Render principal — "Todos en 0" (`allZero`, `data.length > 0`)

Misma pantalla que la tabla cargada (reusa `NAVY_BG`):

- **Header navy** (`NAVY_BG`, texto blanco):
  - Etiqueta mono `TABLA` (`text-violet-light`).
  - Título **Todos en 0** (`font-display`, black).
  - Una línea: **"{N} jugadores listos · la tabla se mueve con el primer partido."**
    donde `N = data.length`.
- **Sección clara debajo** (mismo `-mt-4 rounded-t-[22px] bg-bg px-5 pt-5` que la
  tabla real):
  - Etiqueta pequeña `EN LA POLLA · {N}` (mono, muted).
  - **Lista plana** de todos los jugadores. Cada fila reusa el estilo de fila de la
    tabla real: `Avatar` (nombre) + nombre (`font-display font-bold text-ink`) +
    `0 pts` (mono, **muted** — no `text-ink`, para señalar que aún no hay puntos).
  - **Sin rangos ni medallas.** No hay número de posición.
  - **El usuario actual (`meId`) va de primero**, con el realce existente
    (`border-violet bg-tint` + badge `TÚ`). El resto **ordenado alfabéticamente**
    por `participant.name` (locale es).
  - Las filas son **estáticas**: no abren el `Sheet`/`PlayerBreakdown` (no hay
    puntos que desglosar todavía). No hay `onClick`.
- **FunFactCard** al final (reusa `src/features/home/components/FunFactCard`),
  para consistencia con `EmptyHome`.
- **Motion:** `stagger` + `fadeUp` de `src/ui/motion`, respetando `useReduced()`,
  igual que `EmptyHome`.

### Render de respaldo — sin jugadores (`data.length === 0`, caso borde)

Header navy con título **Aún no hay jugadores** y la misma etiqueta `TABLA`, sin
lista. Debajo, la `FunFactCard`. Es un caso defensivo (normalmente el usuario
actual siempre está en el roster).

## Decisiones tomadas

- **Lista plana, no podio.** Con todos en 0 el podio comunica un orden falso; una
  lista plana es más honesta y legible (audiencia incluye personas mayores).
- **"Tú" anclado de primero**, resto alfabético — el jugador se ve sin scroll.
- **`0 pts` en muted**, no en tinta fuerte, para no simular puntaje real.
- **Sin banner extra**: la línea del header ya explica cuándo se mueve la tabla.
- Se conserva la `FunFactCard` por consistencia con el Inicio vacío.

## Fuera de alcance

- `ScoreboardSkeleton` y `ScoreboardError` se quedan igual.
- No se tocan `hooks.ts`, `api.ts` ni el endpoint.
- No se añade cuenta regresiva (no hay fuente de fecha del primer partido en esta
  vista).

## Pruebas

- Test de render: con un `data` de varias entradas todas en `total: 0`, se muestra
  "Todos en 0", el conteo correcto, el usuario actual de primero con badge `TÚ`, y
  el resto alfabético. Las filas no son botones.
- Caso borde: `data: []` muestra "Aún no hay jugadores" sin filas.
- Sanity: con datos con puntos (`total > 0`) NO se muestra el estado vacío (la lógica
  `allZero` existente se mantiene).

## Archivos

- `src/features/scoreboard/Scoreboard.tsx` — reemplazar `ScoreboardEmpty`.
- Test asociado del scoreboard (crear/extender).
