# Polla Mundial 2026 — Diseño visual (Entrega 4): Tabla (podio + detalle)

**Fecha:** 2026-06-08
**Estado:** Diseño aprobado en mockups interactivos (visual companion), pendiente de revisión del spec.
**Depende de:** Entregas 2 y 3 (sistema de diseño, primitivas `Sheet`/`Avatar`/`Confetti`, momentos navy). Esta entrega estiliza la **Tabla** reutilizando ese sistema; no cambia la lógica de dominio.

---

## 0. Resumen y alcance

Hoy `/tabla` (`Scoreboard`) y `/tabla/:participantId` (`Breakdown`) son HTML pelado. Esta entrega los reemplaza por una **tabla tipo Kahoot**: un **podio navy** con el top 3, debajo la **lista** del resto, y al tocar a un jugador un **bottom-sheet** con su detalle de puntos (desglose por categoría).

**En alcance (Entrega 4):**
1. **Podio navy inmersivo** (top 3, orden 2-1-3, 1º coronado + chip de premio dorado), como "momento de marca" navy.
2. **Lista** de jugadores rank 4+ en un panel claro, con resaltado de "mi" fila.
3. **Detalle del jugador** como `Sheet`: posición, total, premio y desglose por categoría (Grupos, Eliminatorias, Terceros, Caballo oscuro, Decepción) con barras proporcionales.
4. **Reutilización de la ruta** `/tabla/:participantId` (deep-link) renderizando el mismo contenido de detalle en pantalla completa.

**No-objetivos:** cambiar contratos/lógica/hooks/scoring; historial partido-por-partido (se decidió usar solo los 5 totales agregados que ya existen); gating nuevo; mantener las secciones de "predicciones de amigos" del `Breakdown` viejo (se retiran del detalle por ser otra feature).

---

## 1. Dirección visual

Reutiliza el sistema de las Entregas 2-3: tema claro/legible con **momentos navy inmersivos** en los hitos (aquí, el podio). **Un solo acento violeta**; semánticos solo para estado; **gold exclusivo de premios** (de ahí que solo el 1º lleve oro: es el ganador del premio). Mobile-first, tap targets ≥48px, números en `JetBrains Mono`.

**Decisiones visuales aprobadas en mockups:**
- **Podio navy** (no claro): fondo navy radial, 3 bloques (2º–1º–3º), 1º más alto con corona y `prizechip` dorado; 2º/3º en violeta. Avatares de iniciales (`Avatar`). Puntos en mono.
- Debajo, **panel claro** redondeado con la lista del resto; **mi fila** resaltada (`bg-tint` + borde violeta + chip "TÚ"); si estoy en el podio, mi bloque lleva anillo.
- **Detalle = bottom-sheet** (no pantalla en el flujo normal): cabecera con avatar + nombre + chip de posición + total grande + barra de premio dorada; desglose "De dónde salen sus puntos" con barras proporcionales; Decepción separada y en ámbar (`lock`) por ser negativa.

---

## 2. Arquitectura y estructura de archivos

```
src/features/scoreboard/
  Scoreboard.tsx       # REESCRITO: podio + lista + "yo" + estados; tap abre Sheet con el detalle
  Podium.tsx           # NUEVO: podio navy (top 3, orden 2-1-3, 1º coronado + premio)
  PlayerBreakdown.tsx  # NUEVO: contenido del detalle (cabecera+total+premio+categorías); usa useBreakdown
  Breakdown.tsx        # REESCRITO: wrapper de pantalla completa para /tabla/:participantId (reutiliza PlayerBreakdown)
  hooks.ts             # SIN CAMBIOS (useScoreboard, useBreakdown)
```

`Podium` y `PlayerBreakdown` no tienen lógica de fetching propia más allá de lo necesario: `Podium` es presentacional (recibe los top 3); `PlayerBreakdown` recibe `participantId` y hace `useBreakdown`. `PlayerBreakdown` se compone tanto dentro del `Sheet` (en `Scoreboard`) como en la página completa (`Breakdown`), evitando duplicar el desglose (DRY).

---

## 3. Especificación por pantalla

### 3.1 Tabla — `Scoreboard.tsx`

- **Datos:** `useScoreboard()` → `data.data: ScoreboardEntry[]` (`rank`, `participant{id,name}`, `total`, `prize|null`) + `data.updatedAt`. `useAuth()` para identificar "yo".
- **Layout:**
  - **Header navy:** título "Tabla" + "Actualizado…" (derivado de `updatedAt`).
  - **Podio** (`Podium`): top 3 (`data.slice(0,3)`), orden visual 2-1-3, 1º coronado + `prizechip` con `prize` formateado; cada bloque: avatar, nombre, puntos (mono), número de posición. Mi bloque (si aplica) con anillo violeta.
  - **Panel claro** con la lista `data.slice(3)`: fila = `rank` (mono) + avatar + nombre + puntos; **mi fila** con `bg-tint`/borde violeta + chip "TÚ".
- **Interacción:** tocar cualquier jugador (podio o lista) → `setSelectedId(id)` → abre `Sheet` con `<PlayerBreakdown participantId={selectedId} rank={...} />`. El `Sheet` se abre **sin título visible** (como en el mockup); para nombrar el `dialog` se le pasa `ariaLabel={nombre del jugador}`. Cierra con Esc/backdrop/grab. Se pasa también la `rank` del jugador (disponible en el `ScoreboardEntry`) para el chip de posición.

> **Extensión de la primitiva `Sheet`:** se añade una prop opcional `ariaLabel?: string`; el `dialog` usa `aria-label = ariaLabel ?? title`. No afecta los usos actuales (powerups) que pasan `title`.
- **Estados:**
  - **loading:** skeleton (bloque de podio + filas `animate-pulse`).
  - **error:** card + "Reintentar" (`refetch`).
  - **empty / pre-torneo:** si `data.length === 0` o **todos los `total === 0`**, muestra estado "La tabla se llena cuando empiecen los partidos" (sin podio).
  - **menos de 3 jugadores:** el podio degrada a los slots disponibles (no rompe).

### 3.2 Detalle — `PlayerBreakdown.tsx`

- **Props:** `participantId: string`, `rank?: number` (para el chip de posición; ausente en deep-link directo).
- **Datos:** `useBreakdown(participantId)` → `ScoreBreakdown` (`participant{id,name}`, `total`, `breakdown{groups,thirds,ko,darkHorse,disappointment}`, `tripleUsesRemaining`, `prize|null`). Es **autocontenido** (renderiza su propia cabecera con el nombre), por lo que sirve igual dentro del `Sheet` (sin título) y en la página completa.
- **Contenido:**
  - Cabecera: `Avatar` + nombre (de `data.participant.name`) + chip de posición si `rank` está (`#rank`, dorado si ≤ 3, neutro si no) ; total grande en mono + "puntos".
  - Si `prize != null`: barra de premio dorada con el monto formateado.
  - "DE DÓNDE SALEN SUS PUNTOS": filas por categoría con ícono (`@phosphor-icons/react`), etiqueta, barra proporcional (al máximo positivo) y valor:
    - Grupos (`groups`), Eliminatorias (`ko`), Terceros (`thirds`): valor plano.
    - Caballo oscuro (`darkHorse`): valor con `+` si es > 0.
    - Decepción (`disappointment`): valor negativo (≤ 0), en ámbar (`lock`), separado por divisor (resta del total).
- **Estados:** loading (skeleton dentro del sheet/página), error (mensaje + reintentar).

### 3.3 Pantalla completa — `Breakdown.tsx`

- Ruta `/tabla/:participantId`. Lee `participantId` con `useParams()`. Renderiza botón de volver (a `/tabla`) + `<PlayerBreakdown participantId={participantId} />`. Sin chip de posición (no hay `rank` en este contexto). Conserva el deep-link sin duplicar el desglose.

### 3.4 Podio — `Podium.tsx`

- Presentacional. Props: `entries: ScoreboardEntry[]` (top 3 en orden de rank) y `meId: string | null` y `onPick(id)`. Renderiza en orden visual 2-1-3, alturas decrecientes, 1º con corona (`Crown` de Phosphor) y `prizechip`; cada bloque es un botón (`onPick`). Mi bloque con anillo. Avatares con `Avatar`.

---

## 4. Motion y accesibilidad

- Entrada escalonada del podio (resorte, `prefers-reduced-motion` → sin animación). Sheet: slide-up (ya implementado en `Sheet`, reduced-motion aware). Barras del desglose se dibujan con transición corta.
- Botones de jugador con `:active` scale; tap targets ≥48px. `Sheet` cierra con Esc/backdrop y foco al panel. Avatares `aria-hidden` (iniciales decorativas; el nombre va en texto). Contraste AA (texto blanco sobre navy en el podio).
- "Yo" se comunica con texto ("TÚ") además del color (no solo color).

## 5. Pruebas

Patrón existente (`renderWithProviders`, MSW, `db.currentSessionId`). Sin snapshots de estilo.

- **`Scoreboard.test.tsx`** (NUEVO):
  - Con `db.currentSessionId = 'p-pedro'`: renderiza el podio con el top 3 del seed (Juan, María, Luis) y resalta la fila de Pedro (#4) con "TÚ".
  - Al tocar a Juan, abre el `Sheet` (role `dialog`) con su desglose: total `463`, Grupos `360`, Eliminatorias `50`, Terceros `40`, Caballo oscuro `+16`, Decepción `-3`.
- Tests existentes (`scoreboard.test.ts` de handlers, `scoring.test.ts`) siguen verdes. `tsc -b` y `eslint` limpios.

## 6. Criterios de éxito

- `/tabla` muestra el podio navy con el top 3 del mock, la lista del resto y mi fila resaltada; tocar un jugador abre el sheet con su desglose por categoría.
- `/tabla/:participantId` sigue funcionando (deep-link) con el mismo contenido en pantalla completa.
- Cero regresiones: tests existentes verdes; `tsc`/`eslint` limpios; `npm run build` OK.
- Mobile-first real (360–390px), contraste y tap targets correctos, `prefers-reduced-motion` respetado.
