# Modo Colombia — diseño

**Fecha:** 2026-07-01
**Estado:** aprobado (brainstorming) · pendiente plan de implementación
**Alcance:** solo frontend (`polla-fe`). No toca backend.

## 1. Objetivo

Todos los participantes de la polla son colombianos: son la misma hinchada. El día
que juega Colombia, el Inicio deja de ser una app neutral y se convierte en un
**takeover ("Modo hincha")** con la identidad tricolor. Es un *momento*, no un tema
permanente: se enciende el día del partido y se apaga solo a medianoche.

## 2. Activación (cuándo se enciende)

Estamos en fase de **eliminatorias (KO)**, así que Colombia solo aparece si sigue viva
en la llave. El takeover se activa cuando:

- Existe un partido de Colombia (equipo `code === 'COL'`) **programado para hoy**
  (fecha en hora Bogotá == `todayBogota()`), en cualquiera de las rondas KO, y
- ese partido tiene ambos equipos definidos (siempre cierto si es hoy).

Ventana: **00:00 → 23:59 Bogotá** del día del partido. Se apaga a medianoche de forma
natural: al rodar `todayBogota()` al día siguiente, el partido deja de ser "de hoy" y
el derivador devuelve `null` (el polling de datos refresca en ≤60 s).

Si no hay partido de Colombia hoy (o Colombia ya fue eliminada), no se activa nada:
Inicio normal.

## 3. Dirección de arte — "Amarillo camiseta"

Elegida sobre "Bandera viva" y "Estadio nocturno". Cálida, editorial, energía de hincha.

- **Fondo del héroe:** amarillo camiseta `#FCD116`.
- **"10" fantasma:** número `10` en Outfit 900, navy `#00318A`, `opacity: .09`, detrás del
  contenido (decorativo, `aria-hidden`).
- **Tipografía principal:** Outfit 900 navy `#00318A` (ej. "COLOMBIA").
- **Acentos:** rojo `#CE1126` (kicker "Vamos mi Colombia", separador "vs", sello).
- **Cuenta regresiva:** cajas navy `#00318A` con dígitos en JetBrains Mono, texto blanco.
- **Contraste con la app:** la base violeta/lavanda de la app se mantiene en todo lo demás;
  el tricolor vive **solo** en el héroe (y como acento sutil en el bracket). Eso lo mantiene
  especial.

Referencia de mockups aprobados: `.superpowers/brainstorm/68468-1782915607/content/`
(`takeover-direction.html`, `takeover-states.html`, `full-home-v2.html`).

## 4. El héroe y sus 3 estados

El mismo héroe evoluciona solo según `status` del partido y el reloj. No hay estado de
empate (en KO siempre hay ganador vía alargue/penaltis).

### 4.1 Cuenta regresiva (`status: 'scheduled'`)
- Kicker rojo: "Vamos mi Colombia".
- Título: "COLOMBIA".
- Rótulo de ronda + hora: p. ej. "Cuartos de final · 20:00" (`ROUND_LONG[slug]` +
  `formatKickoffBogota(scheduledAt)`).
- Matchup: `COL vs {RIVAL}` con banderas (`Flag`).
- Cuenta regresiva viva hacia `scheduledAt` usando `useCountdown` (hrs/min/seg).
  Cuando el countdown llega a cero pero el `status` sigue `scheduled`, se muestra
  "Por comenzar" hasta que el backend marque `live` (llega por polling).

### 4.2 En vivo (`status: 'live'`)
- El **marcador es el héroe**: `COL {golesCol} – {golesRival} {RIVAL}`, números grandes en
  Outfit 900 navy.
- Indicador "EN VIVO" en rojo con punto que pulsa. (No mostramos minuto: el contrato no lo
  expone de forma confiable; solo `status`.)
- Marcador desde `result?.scoreHome/scoreAway` cuando está disponible; si aún no hay, se
  muestra "EN VIVO" sin números.
- Nota de dato: el marcador llega por polling (~60 s), no hay eventos de gol al instante.

### 4.3 Ganó (`status: 'finished'` y `result.winnerTeamId === Colombia.id`)
- **Confeti tricolor** (ver §6.1): dispara **una sola vez** por victoria (guardado por
  `match.id` en `sessionStorage`) para no re-estallar en cada render/visita esa noche.
- Título rojo/navy: "¡GANÓ COLOMBIA!".
- Marcador final: `COL 2 – 1 {RIVAL}`.
- **Sello** dinámico según la ronda que se gana (ver §6.2).
- Persiste hasta medianoche (mientras el partido siga siendo "de hoy").

### 4.4 Perdió (`status: 'finished'` y Colombia NO es `winnerTeamId`)
- **Sin estado especial.** El derivador devuelve `null` → Inicio vuelve a normal: el
  partido de Colombia aparece como una card finalizada más en la lista del día, y **reaparece
  el cuadro de posición**.

## 5. El Inicio con takeover activo

El takeover es el **héroe del Inicio**, no un reemplazo de pantalla. Composición ese día:

1. **Héroe Colombia** (reemplaza al `DashboardHeader` en el tope).
2. ~~`PositionCard` (puntos/posición)~~ → **oculto** mientras el takeover está activo. El
   foco es Colombia; la tabla vuelve sola al apagarse (medianoche) o si Colombia pierde.
3. **`PendingKoAlert`** (si hay pronósticos KO pendientes) → se mantiene (es accionable).
4. **"También hoy"**: los demás partidos del día en su card normal (`MatchCards`). El partido
   de Colombia **sale** de esa lista (subió al héroe) vía `excludeId`.
5. **`FunFactCard`** al cierre (navy de la app, sin cambios).

Casos borde:
- Si el de Colombia es el **único** partido del día, tras excluirlo `MatchCards` no renderiza
  nada (ya devuelve `null` con lista vacía) → queda héroe + funfact.
- Mientras cargan los datos KO, el derivador devuelve `null` → Inicio normal hasta que llegan
  (posible breve "flash" a normal→héroe; aceptable).

## 6. Piezas reutilizadas / extendidas

### 6.1 Confeti tricolor
Extender `src/ui/Confetti.tsx` con prop opcional `colors?: string[]` (default = paleta actual,
retrocompatible). Modo Colombia pasa `['#FCD116', '#00318A', '#CE1126', '#ffffff']`. Ya respeta
`prefers-reduced-motion` (`useReduced`) y limpia sus piezas al desmontar.

### 6.2 Sello (nuevo, patrón de `Stamp`)
`Stamp` actual está fijo a `'listo' | 'volver'`. Se crea un componente pequeño en la carpeta
`colombia/` reusando el patrón visual (rotado ~-8°, `border-4`, `uppercase`, `font-display`),
con color rojo/navy. Texto según la ronda ganada (el ganador **avanza a**):

| Ronda ganada (`slug`) | Sello                |
|-----------------------|----------------------|
| `r32` (Dieciseisavos) | "A octavos"          |
| `r16` (Octavos)       | "A cuartos"          |
| `qf` (Cuartos)        | "A la semifinal"     |
| `sf` (Semifinal)      | "A la final"         |
| `final`               | "¡CAMPEÓN!"          |
| `3rd` (Tercer puesto) | "Tercer puesto"      |

(Copy afinable; el mapeo es la fuente de verdad.)

### 6.3 Otras
- `useCountdown` (`src/features/home/useCountdown.ts`) para la cuenta regresiva.
- `Flag` (`src/ui/Flag.tsx`) para banderas.
- `formatKickoffBogota` (`src/features/home/format.ts`) para la hora.
- `ROUND_LONG` (`src/features/ko/koView.ts`) para el rótulo de ronda.
- Motion via `framer-motion` + `src/ui/motion.ts` (respetar `useReduced`).

## 7. Acento tricolor permanente en el bracket

En `src/features/ko/KoBracketView.tsx`, la card del cruce de Colombia lleva un **acento
tricolor sutil y permanente** que la distingue del resto (identidad, no takeover):

- **Detección:** cualquier lado con `code === 'COL'`, tanto en `BracketCard` (equipos reales)
  como en `UndefinedCard` (proyección: `slot.projHome/projAway?.code === 'COL'`).
- **Visual:** franja vertical de ~3px en el borde izquierdo de la card, gradiente
  amarillo (40%) / azul (30%) / rojo (30%). La card ya es `rounded-xl overflow-hidden`, así que
  la franja recorta limpio. Permanente, sin animación.
- Helper compartido `isColombiaSlug`/`sideIsColombia` para no repetir la condición.

## 8. Arquitectura (módulos y aislamiento)

Carpeta nueva `src/features/home/colombia/`:

- **`colombiaTakeover.ts` — lógica pura, testeable sin render.**
  ```ts
  export const COLOMBIA_CODE = 'COL'
  export type ColombiaPhase = 'countdown' | 'live' | 'won'
  export interface ColombiaTakeover {
    phase: ColombiaPhase
    match: KoMatch
    roundLong: string          // "Cuartos de final"
    colombia: KoTeam
    opponent: KoTeam
    kickoffAt: string
    score: { col: number; opp: number } | null   // live/won
    stampText: string | null   // solo phase 'won'
  }
  export function deriveColombiaTakeover(input: {
    rounds: KoMatchesResponse[]   // de useAllKoPredictions()
    today: string                 // todayBogota()
    now: number                   // now()
  }): ColombiaTakeover | null
  ```
  Reglas: recorre `rounds[].matches`, busca el partido de hoy con un lado `COL`; deriva
  `colombia`/`opponent` por code; `phase` desde `status` (`scheduled→countdown`,
  `live→live`, `finished→won` solo si Colombia es `winnerTeamId`, si no `null`);
  `stampText` desde el slug de la ronda (§6.2).

- **`useColombiaTakeover.ts` — hook.** Envuelve `useAllKoPredictions()` (mismos datos que
  ya usa `MatchCards`/`liveHome`, compartidos por React Query) + `todayBogota()`/`now()` y
  memoiza `deriveColombiaTakeover`. **Requisito de datos:** el KO debe refrescar durante el
  partido (polling) para captar transiciones `scheduled→live→finished`/marcador; alinear con
  el `pollMs: 60_000` que ya usa `MatchCards` para grupos (ver §11, riesgo abierto).

- **`ColombiaHero.tsx` — componente cliente** (`framer-motion`). Recibe `takeover` y renderiza
  el subestado (`CountdownHero` / `LiveHero` / `WonHero`), cada uno pequeño y aislado. Las
  animaciones perpetuas (float del "10", pulso del "EN VIVO") viven en subcomponentes
  memoizados y respetan `prefers-reduced-motion`.

Integración:

- **`Dashboard.tsx`:** `const takeover = useColombiaTakeover()`. En el tope:
  `{takeover ? <ColombiaHero takeover={takeover}/> : <DashboardHeader subtitle={subtitle}/>}`.
  Pasa `takeover` a la vista live.
- **`states/LiveHome.tsx`:** recibe `takeover`. Si está activo: no renderiza `PositionCard`
  y pasa `<MatchCards excludeId={takeover.match.id} heading="También hoy" />`.
- **`components/MatchCards.tsx`:** props nuevas `excludeId?: string` y `heading?: string`;
  filtra la lista y usa el heading (default: comportamiento actual).

## 9. Accesibilidad, motion, performance

- Decoraciones (`10` fantasma, confeti) con `aria-hidden`. El héroe expone un `aria-label`
  claro (p. ej. "Hoy juega Colombia contra Brasil, cuartos de final, 20:00").
- Todo movimiento respeta `prefers-reduced-motion` (`useReduced`): sin float, sin pulso, sin
  confeti; el contenido se muestra estático.
- Animar solo `transform`/`opacity`. Confeti one-shot (no loop). Sin `h-screen`; layout mobile
  a `w-full`.

## 10. Testing (test-first, según CLAUDE.md)

Primero el test que reproduce/define, luego el código:

- **`colombiaTakeover.test.ts`** (núcleo):
  - sin partido COL hoy → `null`.
  - partido COL hoy `scheduled` → `phase 'countdown'`, opponent/round correctos, `stampText null`.
  - `live` → `phase 'live'`, score desde `result`.
  - `finished` + Colombia gana → `phase 'won'`, `stampText` correcto por ronda (qf→"A la
    semifinal", `final`→"¡CAMPEÓN!").
  - `finished` + Colombia pierde → `null`.
  - COL como local y como visitante → `colombia`/`opponent` correctos en ambos.
  - partido COL existe pero no es hoy → `null`.
- **Componentes** (Testing Library, opcional pero recomendado): `ColombiaHero` renderiza cada
  fase; `LiveHome` oculta `PositionCard` y excluye el match cuando hay takeover; `MatchCards`
  respeta `excludeId`.
- **Verificación visual** (obligatoria por CLAUDE.md): screenshots mobile (390×844) de las 3
  fases + home completo + acento del bracket, vía Playwright/`scripts/dev-smoke.mjs`.
- `npm run build`, `npm test` y `npm run lint` en verde antes de push (cada push a `main`
  despliega a producción).

## 11. Riesgos / decisiones abiertas

- **Polling del KO durante el partido:** confirmar que `useAllKoPredictions` refresca en vivo
  (status/score/result). Si no, añadir `pollMs` al hook (paridad con `MatchCards`). *Solo FE;
  si faltara algún dato de marcador en vivo en el contrato, se reporta — no se toca backend.*
- **Minuto de juego:** no se muestra (no está en el contrato de forma confiable).
- **Copy** de kicker ("Vamos mi Colombia") y sellos: afinable sin cambiar arquitectura.
- **Flash de carga** (normal→héroe mientras cargan datos): aceptado; se puede mitigar luego.

## 12. Fuera de alcance

- Sonido/himno (restricciones de autoplay mobile + gusto).
- Build-up multi-día ("faltan 2 días").
- Takeover del bracket el día del partido (solo acento permanente; se descartó el modo fuerte).
- Cambios de backend de cualquier tipo.
