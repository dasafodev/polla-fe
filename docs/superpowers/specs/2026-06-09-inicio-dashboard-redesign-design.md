# Rediseño del Inicio (Dashboard) por estados

**Fecha:** 2026-06-09
**Pantalla:** `src/features/home/Dashboard.tsx` (ruta `/`, primera pantalla tras login)

## Problema

El Inicio actual es, en la práctica, una **lista de tareas de onboarding**. Esto causa tres problemas:

1. **El progreso se dice dos veces.** El anillo de % y el texto "Sigue: …" del héroe resumen lo mismo que la lista "Completa tu polla" de abajo.
2. **"Completa tu polla" duplica los tabs de Predicciones.** Grupos · Terceros · Pálpitos aparecen como navegación en dos pantallas: el usuario no sabe cuál es "la buena".
3. **Cuando la polla está lista, el Inicio se queda sin oficio.** Todo dice ✓✓✓ y no muestra nada vivo (puntos, ranking, próximo partido). El CTA desaparece.

## Idea de fondo

El Inicio **cambia de oficio según el momento**: antes empuja a completar; después resume el estado vivo. No debe mostrar ambas cosas a la vez. Modelamos cuatro estados, cada uno con **un foco claro** y **sin repetir** la data que ya vive en Predicciones.

Insight clave del backend: la "polla completa" (grupos + terceros + pálpitos) **no es el final**. Los partidos de eliminatoria se pronostican **uno a uno durante el torneo** (cada `KoMatch` tiene su propio `lockedAt`). Por eso el estado "en vivo" tiene trabajo nuevo y recurrente: pronosticar los KO abiertos antes de que cierren.

## Los cuatro estados

Todos comparten el mismo **encabezado** (saludo "Hola, {name}", subtítulo contextual, avatar con menú de logout). El cuerpo cambia.

| # | Estado | Disparador (desde `useOnboardingState()`) | Foco | Subtítulo del header |
|---|--------|-------------------------------------------|------|----------------------|
| 1 | **Vacía** | `isFirstTime && !locked` | Arrancar. 1 sola decisión. | "Antes de que arranque el Mundial" |
| 2 | **A medias** | `!isFirstTime && !isComplete && !locked` | Terminar lo que falta. | "Faltan N días para el cierre" |
| 3 | **Lista · abierta** | `isComplete && !locked` | Esperar tranquilo / ajustar. | "Faltan N días para el cierre" |
| 4 | **En vivo** | `locked` | Seguir mi posición **+ pronosticar KO pendientes**. | "El Mundial está en juego" |

`N días` = `daysUntil(closesAt)`, donde `closesAt = friends.availableAt` (de `useFriendsGroups()`, ya cableado en `onboardingState`).

### Estado 1 — Vacía
- Héroe navy: rótulo "POLLA MUNDIAL 2026", titular "Arma tu polla en 5 minutos", una línea de qué incluye, **un solo CTA**: "Empezar →" (`/onboarding`).
- **Fun fact card** debajo (ver sección Fun facts).
- Sin tarjeta de premio (eliminada).

### Estado 2 — A medias
- Héroe navy con **anillo de progreso** (`ProgressRing`, `percent`) + titular "Casi lista" + "Te falta: …" + CTA "Continuar donde quedé →" (salta al `nextStepKey`).
- **Chips de pendientes** debajo del héroe: solo lo que falta como chips (`● Terceros · 3/8`, `● Pálpitos · 0/2`); lo hecho se colapsa en un chip ✓ (`✓ Grupos`). **El % vive una sola vez** (en el anillo).
- **Fun fact card** debajo.
- Sin lista expandida "Completa tu polla" (se elimina la duplicación con Predicciones).

### Estado 3 — Lista · abierta
- Héroe navy centrado: ✓ "¡Polla lista!" + cuenta regresiva al cierre + "Ajusta hasta entonces".
- Tarjeta **"Tus apuestas estrella"**: La revelación ↗ (verde) y La decepción ↘ (rojo), con nombre/bandera del equipo. Es lo único "jugoso" de la polla que no se resume en otra pantalla.
- Link suave "Revisar mi polla →" (`/predicciones`).
- Sin check-list (todo está ✓).

### Estado 4 — En vivo (prioriza KO pendientes)
Pila de tarjetas, en orden de prioridad:
1. **Alerta de KO pendientes** (solo si hay): "⏰ Tienes N partidos por pronosticar · {ronda} · el primero cierra {fecha}" + CTA "Pronosticar ahora →" a `/eliminatorias` (lista de rondas `KoRoundList`, desde donde se entra a pronosticar cada partido). Es lo accionable → manda arriba.
2. **Tarjeta de posición**: `#{rank}` · `{total} pts` · "de {totalParticipants}" · "Líder va +{leaderGap}" · (si fuera del podio) "podio a +{podiumGap}". Navega a `/tabla`.
3. **Próximo partido** (solo si hay un KO con equipos definidos y kickoff futuro): banderas + códigos + hora.
4. **Barra de pálpitos** ganados/perdidos (ver sección Pálpitos).

Si **no** hay KO pendientes ni próximo partido (típico durante la fase de grupos, cuando los cruces de R32 aún son TBD), el Estado 4 se reduce a **posición + barra de pálpitos**. No se inventan fixtures de fase de grupos: `ROUND_SLUGS` solo cubre `r32…final`, así que el Inicio nunca muestra partidos de grupos.

## Fuentes de datos (todo real, hooks existentes)

| Dato | Hook existente | Campo |
|------|----------------|-------|
| Estado/progreso/lock/cierre | `useOnboardingState()` | `isFirstTime, isComplete, locked, percent, steps, nextStepKey, closesAt` |
| Apuestas estrella | `usePowerups()` | `darkHorse, disappointment` |
| Posición y puntos | `useScoreboard()` | `data[]` (rank, participant, total, prize), `updatedAt` |
| Desglose / triple | `useMyTotals()` (=`useBreakdown(myId)`) | `breakdown, tripleUsesRemaining` |
| KO pendientes + próximo partido | `useAllKoPredictions()` | `rounds[].matches[]` (`status, locked, scheduledAt, homeTeam, awayTeam, myPrediction`) |
| Barra de pálpitos | `usePowerups()` | `pointsEarned` |

Ningún endpoint nuevo. Todos los hooks ya existen en el FE.

## Derivaciones (función pura testeable)

Nueva función `deriveLiveHome(input)` + hook `useLiveHome()`, **espejando el patrón** de `onboarding/onboardingState.ts` (`deriveOnboardingState` + test). Solo se consume en el Estado 4.

**Posición** (de `Scoreboard.data`, ordenado por rank asc):
- `me = data.find(e => e.participant.id === myId)`; `myRank = me.rank`; `myTotal = me.total`; `totalParticipants = data.length`.
- `leaderGap = data[0].total - myTotal` (0 si soy líder).
- `podiumGap`: si `myRank > 3` → `data[2].total - myTotal` (puntos para entrar al podio); si `myRank <= 3` → null (mostrar premio/posición de podio).
- Borde: si todos en 0 (pre-resultados) → mostrar rank pero "aún sin puntos", gaps en 0.

**KO pendientes** (flatten `rounds[].matches`):
- `predecible(m) = m.homeTeam != null && m.awayTeam != null` (se necesita `teamAdvancesId` ∈ equipos).
- `pendiente(m) = predecible(m) && !m.locked && m.status === 'scheduled' && m.myPrediction == null`.
- `pendientes = matches.filter(pendiente)`. Si vacío → sin alerta.
- Agrupar por ronda; `rondaAbierta` = la de menor `order` con pendientes; `count` = pendientes de esa ronda; `deadline` = `min(lockedAt)` de esos partidos.

**Próximo partido**:
- candidatos = matches con `predecible(m)` y (`status === 'scheduled'` con `scheduledAt` futuro) o `status === 'live'`.
- `next` = el de menor `scheduledAt` (los 'live' primero). Si no hay → ocultar tarjeta.

**Barra de pálpitos** (de `MyPowerups.pointsEarned`):
- `won = pts_dark_horse_per_round` (≥0); `lost = Math.abs(pts_disappointment_per_round)` (≤0 → magnitud); `net = total`.
- `magnitud = won + lost`. Si `pointsEarned == null` o `magnitud === 0` → **estado vacío** (barra gris, "Aún sin puntos de pálpitos").
- `greenPct = won / magnitud`, `redPct = lost / magnitud`.
- Número protagonista = `net` con signo (ej. "+10 neto").

## Fun facts

- **Data estática en el FE** (el backend no provee fun facts): `src/features/home/data/funFacts.ts` exporta un array de `{ id, text, source, url }` con los **30 datos verificados** (lista abajo).
- **Rotación:** cambia en **cada entrada** al Inicio. Implementación: `useState(() => funFacts[Math.floor(Math.random() * funFacts.length)])` en `FunFactCard`, de modo que sea estable dentro de un montaje y cambie en cada navegación a `/`. (`Math.random` es válido en código de app.)
- Se muestra solo en Estados 1 y 2. Card de tono cálido (no compite con el CTA). Ícono 💡, rótulo "DATO MUNDIALISTA", texto.

### Los 30 datos (verificados por subagente Opus contra fuentes reales)

> Cada uno con su fuente. Confianza alta en todos. Tono informativo, español Colombia.

1. El Mundial 2026 será el más grande de la historia: 48 selecciones y 104 partidos, en 3 países anfitriones (EE.UU., México y Canadá). — FIFA/Wikipedia · https://en.wikipedia.org/wiki/2026_FIFA_World_Cup
2. Es el primer Mundial organizado por tres países a la vez. Antes solo Japón y Corea lo compartieron, en 2002. — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
3. El partido inaugural será el 11 de junio de 2026 en el Estadio Azteca: México vs. Sudáfrica. — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/estadio-azteca-mexico-city-host-opening-match-world-cup-2026
4. El Estadio Azteca será el primer estadio en albergar tres Mundiales (1970, 1986 y 2026) y sus tres partidos inaugurales. — beIN Sports · https://www.beinsports.com/en-us/soccer/fifa-world-cup-2026/articles/estadio-azteca-will-make-history-at-the-2026-world-cup-as-the-first-stadium-to-host-three-fifa-world-cup-opening-matches-2026-06-02
5. Con 2026, México es el primer país en organizar tres Copas del Mundo masculinas. — Wikipedia · https://en.wikipedia.org/wiki/2026_FIFA_World_Cup
6. La final del Mundial 2026 se jugará el 19 de julio en el MetLife Stadium de Nueva Jersey. — Sky Sports · https://www.skysports.com/football/news/12010/13272067/2026-world-cup-dates-venues-host-cities-and-format-for-usa-canada-and-mexico-tournament
7. 2026 es el primero en que las seis confederaciones tienen cupo garantizado: Oceanía lo logra por primera vez (Nueva Zelanda). — Wikipedia · https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_qualification
8. El balón oficial de 2026, "Trionda", lleva un chip con tecnología que ayuda al VAR a detectar toques y fueras de lugar. — Wikipedia · https://en.wikipedia.org/wiki/Adidas_Trionda
9. Brasil es el único país que ha jugado todos los Mundiales desde 1930 y el más ganador, con cinco títulos. — Olympics.com · https://www.olympics.com/en/news/most-fifa-world-cup-football-wins
10. Tras Brasil, Alemania e Italia suman cuatro títulos cada una; Argentina, tres (1978, 1986 y 2022). — Wikipedia · https://en.wikipedia.org/wiki/List_of_FIFA_World_Cup_finals
11. El máximo goleador histórico de los Mundiales es Miroslav Klose, con 16 goles en cuatro ediciones (2002–2014). — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/articles/miroslav-klose-germany-top-goalscorer
12. El récord de goles en un solo Mundial es de Just Fontaine: 13 en seis partidos, en 1958. Lleva más de 65 años intacto. — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/articles/just-fontaine-france-goals-one-edition-record-1958
13. Pelé es el único jugador que ha ganado tres Mundiales (1958, 1962 y 1970). — Britannica · https://www.britannica.com/biography/Pele-Brazilian-athlete
14. Pelé marcó en la final de 1958 con 17 años: sigue siendo el único en anotar en un Mundial antes de cumplir los 18. — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/articles/pele-brazil-youngest-goal-final-scorer-sweden-1958
15. Lionel Messi tiene el récord de más partidos en Mundiales: 26, al disputar la final de Qatar 2022. — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/articles/lionel-messi-appearances-record
16. Cafú es el único que ha jugado tres finales consecutivas de un Mundial: 1994, 1998 y 2002. — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/articles/cafu-brazil-three-finals
17. El gol más rápido de los Mundiales: Hakan Şükür, a los 11 segundos (Turquía-Corea, 2002). — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/articles/hakan-sukur-fastest-goal-2002
18. El partido con más goles fue Austria 7-5 Suiza, en cuartos de 1954: 12 goles que nadie ha igualado. — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/articles/austria-switzerland-highest-scoring-game-1954
19. En 2014, Alemania goleó 7-1 a Brasil anfitrión en semis: la peor derrota de un local. El "Mineirazo". — Wikipedia · https://en.wikipedia.org/wiki/Brazil_v_Germany_(2014_FIFA_World_Cup)
20. El "Maracanazo" de 1950: Uruguay venció 2-1 a Brasil en su casa. Asistencia oficial récord: 173.850 personas. — Guinness · https://www.guinnessworldrecords.com/news/2014/6/world-cup-rewind-world-cup-rewind-largest-attendance-at-a-match-in-the-1950-brazil-final
21. En 1986 Maradona marcó a Inglaterra la "Mano de Dios" y, 4 minutos después, el gol elegido por FIFA como el mejor de la historia. — FIFA · https://www.fifa.com/en/articles/diego-maradona-argentina-england-hand-of-god-1986
22. Geoff Hurst es el único con un hat-trick en una final: tres goles en el 4-2 de Inglaterra a Alemania en 1966. — FIFA · https://www.fifa.com/en/articles/100-great-world-cup-moments-qatar-2022-66-geoff-hurst-england-1966
23. El primer Mundial fue Uruguay 1930, con 13 selecciones. Lo ganó el anfitrión, 4-2 a Argentina. — Wikipedia · https://en.wikipedia.org/wiki/1930_FIFA_World_Cup
24. El primer gol de la historia de los Mundiales lo marcó el francés Lucien Laurent, en 1930 ante México. — FIFA · https://inside.fifa.com/tournaments/mens/worldcup/1930uruguay/news/lucien-laurent-the-first-world-cup-goalscorer
25. Solo dos Mundiales no se jugaron: 1942 y 1946, cancelados por la Segunda Guerra Mundial. 12 años de parón. — Wikipedia · https://en.wikipedia.org/wiki/History_of_the_FIFA_World_Cup
26. El trofeo Jules Rimet fue robado en 1966 y lo encontró un perro llamado Pickles, bajo un seto en Londres. — Wikipedia · https://en.wikipedia.org/wiki/1966_theft_of_the_Jules_Rimet_Trophy
27. El jugador más joven en un Mundial es el norirlandés Norman Whiteside: 17 años y 41 días, en 1982. — FIFA · https://www.fifa.com/en/tournaments/mens/worldcup/articles/norman-whiteside-record-1982
28. Marruecos hizo historia en 2022: primer país africano y árabe en llegar a semifinales de un Mundial. — Wikipedia · https://en.wikipedia.org/wiki/Morocco_at_the_FIFA_World_Cup
29. James Rodríguez fue el primer colombiano con la Bota de Oro: 6 goles en Brasil 2014, el mejor Mundial de Colombia. — Sports Illustrated · https://www.si.com/soccer/2014/07/14/james-rodriguez-golden-boot-world-cup-colombia
30. Rumbo al Mundial de 1994, Colombia goleó 5-0 a Argentina en Buenos Aires. Hasta Maradona terminó aplaudiendo. — Wikipedia · https://en.wikipedia.org/wiki/Argentina_v_Colombia_(1994_FIFA_World_Cup_qualification)

## Arquitectura / archivos

Reestructuramos `src/features/home/` en unidades enfocadas (en línea con el patrón actual del proyecto: `Card`, `Chip`, `Button`, `Avatar`, `ProgressRing`, `NavyBackdrop`, `motion`).

```
src/features/home/
  Dashboard.tsx              # header + ruteo por estado (delgado)
  liveHome.ts                # deriveLiveHome() puro + useLiveHome() hook
  liveHome.test.ts           # tests de la función pura
  data/funFacts.ts           # los 30 datos { id, text, source, url } + pickRandom
  components/
    DashboardHeader.tsx      # saludo + subtítulo + avatar/menú (extraído del actual)
    FunFactCard.tsx          # card de dato (aleatorio por montaje)
    StarBets.tsx             # "Tus apuestas estrella" (revelación/decepción)
    PendingKoAlert.tsx       # alerta de KO pendientes + CTA
    PositionCard.tsx         # #rank · pts · gaps
    NextMatchCard.tsx        # próximo partido
    PalpitosBar.tsx          # barra ganados/perdidos + estado vacío
  states/
    EmptyHome.tsx            # estado 1
    InProgressHome.tsx       # estado 2
    ReadyHome.tsx            # estado 3
    LiveHome.tsx             # estado 4 (usa useLiveHome + componentes)
```

`Dashboard.tsx` decide el estado:
```
if (state.loading) → ScreenSkeleton
else if (state.locked) → <LiveHome/>
else if (state.isComplete) → <ReadyHome/>
else if (state.isFirstTime) → <EmptyHome/>
else → <InProgressHome/>
```

### Qué se elimina del Dashboard actual
- La sección "Completa tu polla" (lista expandida que duplica los tabs de Predicciones).
- La tarjeta de premio "Bolsa $1.000.000" (en todos los estados).
- El doble conteo de progreso (anillo + lista). El % queda solo en el anillo (Estado 2).

## Manejo de estados de carga y borde

- **Loading:** mientras `state.loading` (o, en vivo, los hooks de scoreboard/ko/powerups) → `ScreenSkeleton` (reusar el patrón de `MisPronosticos`).
- **Scoreboard en 0 (pre-resultados):** Estado 4 muestra rank pero "aún sin puntos"; gaps en 0.
- **Fase de grupos (sin KO predecibles):** Estado 4 sin alerta ni próximo partido → solo posición + pálpitos.
- **`pointsEarned == null` o magnitud 0:** barra de pálpitos en estado vacío.
- **`darkHorse`/`disappointment` null en `locked`:** no debería ocurrir (la polla está completa), pero las tarjetas guardan contra null.

## Testing

Estilo del repo (Vitest + Testing Library), espejando `onboardingState.test.ts` y `Dashboard.test.tsx`:
- `liveHome.test.ts`: posición y gaps (líder, podio, fuera de podio, todos en 0); selección de KO pendientes (predecible, no bloqueado, sin predicción); próximo partido (live primero, futuro más cercano, ninguno); matemática de la barra (verde/rojo, neto, vacío).
- `Dashboard.test.tsx` (extender): dado cada combo de flags de onboarding, renderiza el componente de estado correcto.
- `FunFactCard.test.tsx`: renderiza un dato del set.
- `PalpitosBar.test.tsx`: lleno vs vacío.

## Fuera de alcance

- Lo **social** (invitar con `?code=`, ver quién entró): explícitamente excluido del Inicio.
- Fixtures/resultados de **fase de grupos** por partido (el backend no los expone como predecibles vía `ROUND_SLUGS`).
- Cambios a Predicciones, Tabla, Eliminatorias u otras pantallas.
- Endpoints nuevos en el backend.
