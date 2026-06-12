# Tabla — switch Provisionales / Oficiales — diseño

Fecha: 2026-06-11
Componentes: `polla-fe` (`src/features/scoreboard/`)

## Problema

La Tabla muestra un único número de puntos por jugador (`entry.total`). Ese total
**mezcla** puntos persistidos (oficiales) con puntos **provisionales** calculados al
vuelo durante la fase de grupos. El usuario no tiene forma de saber que lo que ve
puede cambiar.

Por dentro el BE ya distingue las dos capas:

- **Persistidos** (`score_events`): se escriben solo cuando un grupo cierra de verdad
  (`isGroupFinalized`: los 4 equipos jugaron 3 partidos + pasaron 2h del último).
- **Provisionales** (`computeProvisionalGroupPoints`, `computeProvisionalKoPoints`,
  `computeProvisionalPowerupGroupPoints`): se calculan en cada `GET /scoreboard`
  según la posición **actual** de cada equipo, y cambian a medida que avanza el torneo.

`getScoreboard()` suma ambas capas en `total` y nunca expone el desglose. Hoy (fase de
grupos sin cerrar) el total mostrado es **enteramente provisional** y los oficiales son **0**.

## Objetivo

Hacer transparente que los puntos visibles son provisionales, mediante un **switch**
en la Tabla con dos vistas:

- **Provisionales** (default): muestra `total` (lo de hoy) + un aviso de que son
  provisionales y se confirman al cerrar cada grupo.
- **Oficiales**: muestra los puntos confirmados. Hoy = 0 para todos.

El switch **no reordena** la tabla: el ranking se mantiene siempre por puntos
provisionales (`total`); el switch solo cambia el **número** que muestra cada fila y
el podio.

## Decisión de alcance (2026-06-12): solo FE, Oficiales en 0

Se evaluó exponer un campo `confirmed` desde el BE (suma de `score_events` persistidos)
para que "Oficiales" mostrara datos reales y se llenara solo al cerrar cada grupo. **Se
descartó tocar el BE por ahora.** La vista "Oficiales" se implementa **quemada en 0** en
el FE.

**Trade-off conocido y aceptado:** apenas cierre el primer grupo y se persistan
`score_events`, la vista "Oficiales" seguirá mostrando 0 (no refleja los confirmados
reales). Para corregirlo en el futuro hay que retomar el cambio de BE descrito en
"Pendiente / evolución".

## Diseño (implementado)

Todo en `polla-fe`. Sin cambios de tipos compartidos ni de mocks.

`src/features/scoreboard/Scoreboard.tsx`:

- Tipo `PointsView = 'provisional' | 'official'` (exportado) + helper puro
  `pointsFor(entry, view) = view === 'provisional' ? entry.total : 0`.
- Estado local `view`, default `'provisional'` (`useState`).
- **Switch segmentado** (`PointsToggle`) bajo el header navy: `[ Provisionales | Oficiales ]`.
  Sobre `bg-white/10`, pastilla activa `bg-white text-ink`, inactiva `text-violet-light`.
  Accesible: `role="group"` + botones con `aria-pressed`.
- **Aviso** debajo del switch, según vista:
  - `provisional`: *"Puntos provisionales — se confirman al cerrar cada grupo."*
  - `official`: *"Aún no hay puntos oficiales. Se asignan al cerrar cada grupo."*
- Las filas (`ScoreboardRow`) muestran `pointsFor(entry, view)` en vez de `entry.total`.
- **Estado vacío**: `allZero` se sigue evaluando sobre `entry.total` (la métrica de
  ranking). Al cambiar a Oficiales con provisionales > 0, NO se cae al `ScoreboardEmpty`;
  se muestran las mismas filas con 0.

`src/features/scoreboard/Podium.tsx`:

- Recibe `view: 'provisional' | 'official'` y muestra `view === 'provisional' ? e.total : 0`.

## Decisiones tomadas

- **El switch no reordena** — el ranking siempre es por provisionales; el switch solo
  cambia el número mostrado.
- **Default = Provisionales**, con el aviso visible — es la vista informativa.
- **Etiquetas: Provisionales / Oficiales.**
- **Oficiales = 0 quemado en FE**, sin tocar BE (ver trade-off arriba).
- **`allZero` sigue sobre `total`** — para no romper la vista al cambiar de modo.

## Fuera de alcance

- El sheet de desglose (`PlayerBreakdown`) y la tarjeta del Dashboard (`PositionCard`)
  se quedan **igual** (siguen mostrando el provisional). Sin etiqueta ni switch ahí.
- No se toca ningún endpoint ni el BE.

## Pendiente / evolución

Para que "Oficiales" muestre datos reales cuando cierren grupos:

- `polla-be` `scoreboard.mapper.ts`: agregar `confirmed: number` al `ScoreboardEntryDto`
  y a `toScoreboardEntryDto`.
- `polla-be` `scoreboard.service.ts` (`getScoreboard`): pasar
  `confirmed = Number(persistedPointsMap.get(p.id) ?? 0)` (sin tocar `total` ni el orden).
- `polla-fe` `types/api.ts`: `confirmed: number` en `ScoreboardEntry`.
- `polla-fe` `pointsFor`: usar `entry.confirmed` en vez de `0`.
- Mock (`src/mocks`): exponer `confirmed` (p. ej. derivado de un `finalizedGroupIds`).

## Pruebas (implementadas)

`src/features/scoreboard/Scoreboard.test.tsx`:

- Default render: vista Provisionales, filas/podio muestran `total`, aviso provisional.
- Al activar Oficiales: los números pasan a 0, aviso oficial, y NO aparece
  `ScoreboardEmpty` (la Tabla sigue visible).

## Archivos

- `polla-fe/src/features/scoreboard/Scoreboard.tsx` — switch + aviso + `pointsFor` + métrica activa.
- `polla-fe/src/features/scoreboard/Podium.tsx` — métrica activa.
- `polla-fe/src/features/scoreboard/Scoreboard.test.tsx` — test del switch.
