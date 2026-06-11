# Consenso de la manada en Grupos y Powerups — diseño

Fecha: 2026-06-11
Componentes:
- `src/features/predicciones/parts.tsx` (`RankingRow`) — grupos
- `src/features/predicciones/PowerupsPanel.tsx` (`PowerupCard`) — powerups
- `src/types/api.ts`, `src/features/groups/api.ts` — tipos y adaptador
- `src/mocks/handlers/groups.ts`, `src/mocks/handlers/powerups.ts` — datos de mock

## Problema

El backend ya calcula y envía una **estadística de consenso** — qué porcentaje de
participantes hizo la misma elección que tú — pero el frontend la descarta en la
capa de tipos:

- **Grupos**: `GET /groups/predictions/me` trae, por cada equipo del ranking,
  `positionStats: { pct } | null` (% de la manada que puso ese equipo en *tu*
  posición predicha). El tipo FE `GroupRanking` no tiene el campo y `adaptRanking`
  no lo copia → se pierde.
- **Powerups**: `GET /powerups/predictions/me` trae, por slot,
  `stats: { chosenPct } | null` (% que eligió ese mismo equipo como revelación /
  decepción). El tipo FE `PowerupTeam` no tiene `stats` → se pierde.

El dato es gratis (cero cambios de backend) y aporta un gancho de "compárate con
la manada" sobre tus propias decisiones.

### Restricción de timing (define el feature)

Los `pct` los calculan dos crons que corren **al iniciar el torneo**
(`0 19 11 6 *` = 11 jun 2026 19:00 UTC), que es justo cuando las predicciones de
grupos/powerups **se bloquean**. Antes de eso el dato es `null`. Por lo tanto es un
feature **post-lock**: "compárate con la manada" en las vistas de solo-lectura, no
una pista en vivo mientras editas. El render debe ser null-safe para el periodo
pre-cron.

## Objetivo

Mostrar el % de consenso como un **chip de texto chico y tenue** al lado de cada
elección del usuario, en sus propias vistas de solo-lectura, reutilizando el dato
que ya llega. Mínimo cambio visual, máximo aprovechamiento del dato.

## Diseño

### Grupos — `RankingRow` (`parts.tsx:23`)

`RankingRow` es el único punto de render y alimenta tanto la lista de `GruposPanel`
como el detalle de `GroupEditSheet`. Tocarlo cubre ambas superficies.

- A la derecha de la fila, antes/junto al badge de resultado, un `<span>` tenue:
  **"{pct}% coincidió"** (ej. `78% coincidió`).
- Estilo: mono, ~`text-[11px]`, color muted (`text-muted` / `text-ink-soft`),
  alineado a la derecha. Sin fondo ni borde.
- **Convivencia con el resultado**: cuando hay `result` (`exact`/`partial`) y
  `showResult` es true, el badge EXACTO/PARCIAL manda y el `%` se muestra más tenue
  (`text-[#6b7280]`/muted) a su izquierda, sin competir. Cuando no hay resultado, el
  `%` ocupa solo ese espacio.
- **Redondeo**: entero en el render (`Math.round(pct)`), aunque el backend mande 2
  decimales.

### Powerups — `PowerupCard` (`PowerupsPanel.tsx:37`)

- Una línea tenue bajo el nombre del equipo: **"{pct}% lo eligió igual"**
  (ej. `22% lo eligió igual`).
- Estilo: `text-xs text-ink-soft`, consistente con la línea "Avanzó N rondas" que
  ya existe en la tarjeta.
- Misma regla de redondeo entero.

### Null-safe (ambos)

Si el `pct` es `null` (el cron no ha corrido, o nadie más eligió esa
posición/equipo), **no se renderiza el chip**. Nunca se muestra `0%` ni un hueco.

## Plomería de datos

Cero cambios de backend. Solo dejar de descartar el campo:

### Grupos (ya hay adaptador)
- `src/types/api.ts`: agregar `consensusPct: number | null` a `GroupRanking`.
- `src/features/groups/api.ts`:
  - `RawRanking` ya puede recibir `positionStats?: { pct: number } | null`.
  - `adaptRanking` mapea `consensusPct: r.positionStats?.pct ?? null`.

### Powerups (no hay adaptador — se respeta)
- `src/types/api.ts`: agregar `stats?: { chosenPct: number | null }` a `PowerupTeam`,
  igual a la forma exacta del backend. `getMyPowerups` lo tipa directo, sin crear
  capa adaptadora nueva.

## Decisiones tomadas

- **Enfoque A (chip inline)**, no barra de distribución (B) ni tarjeta "contrarian"
  (C). El usuario priorizó el cambio mínimo que aprovecha el dato.
- **Solo las vistas propias (yo) en v1.** Las vistas de amigos
  (`/groups/predictions/friends`, `/powerups/predictions/friends`) traen el mismo
  dato pero quedan como fast-follow.
- **Redacción**: "{pct}% coincidió" (grupos) / "{pct}% lo eligió igual" (powerups).
- **El % se atenúa, el resultado manda** cuando ambos coexisten.
- Se aplana el dato de grupos a `consensusPct` (vía adaptador existente) pero se
  respeta la forma anidada `stats.chosenPct` en powerups (no hay adaptador que tocar).

## Fuera de alcance

- Vistas de amigos (fast-follow).
- Barras de distribución por posición (enfoque B, requería cruzar `GET /groups`).
- Tarjeta resumen "contrarian" (enfoque C).
- Cualquier cambio de backend, crons o esquema.
- El editor de powerups (`Powerups.tsx`) y el de grupos (`GroupsEditor`): el chip
  vive en las vistas de resumen/solo-lectura, no en el flujo de edición.

## Pruebas

- **Grupos**: con `positionStats.pct` presente, `RankingRow` muestra
  "{pct}% coincidió" redondeado. Con `null`, no se renderiza el chip. Con
  `result === 'exact'` y `showResult`, conviven badge EXACTO + `%` tenue.
- **Powerups**: con `stats.chosenPct` presente, `PowerupCard` muestra
  "{pct}% lo eligió igual". Con `null`/sin `stats`, no se renderiza la línea.
- **Adaptador grupos**: `adaptRanking` copia `positionStats.pct` a `consensusPct`
  y resuelve a `null` cuando falta.
- **Mocks**: `groups.ts` y `powerups.ts` actualizados para incluir el campo, de modo
  que el dev/MSW muestre el chip.

## Archivos

- `src/types/api.ts` — `GroupRanking.consensusPct`, `PowerupTeam.stats`.
- `src/features/groups/api.ts` — `RawRanking` + `adaptRanking`.
- `src/features/predicciones/parts.tsx` — chip en `RankingRow`.
- `src/features/predicciones/PowerupsPanel.tsx` — línea en `PowerupCard`.
- `src/mocks/handlers/groups.ts`, `src/mocks/handlers/powerups.ts` — datos de mock.
- Tests asociados de `parts`/`PowerupsPanel`/adaptador (crear/extender).
