# Sección de reglas "Cómo se juega" — Diseño

**Fecha:** 2026-06-09
**Estado:** Aprobado para planificación

## Objetivo

Agregar una sección de reglas que explique la dinámica del juego (referencia
completa de puntaje), accesible desde el home. El usuario debe poder consultar
cómo se ganan/pierden puntos en cada fase sin salir del home.

## Decisiones

- **Profundidad:** referencia completa de puntaje, con los valores concretos de
  cada categoría.
- **Acceso:** ítem nuevo **"Cómo se juega"** en el dropdown del avatar del
  `DashboardHeader` (junto a "Cerrar sesión"). Disponible en los 4 estados del
  home porque el header es común.
- **Formato:** bottom sheet (primitivo `Sheet` existente), no una ruta nueva.
  Scroll interno, máx 80% de alto.

## Arquitectura

Sin cambios de routing, sin librerías nuevas, sin i18n (copy en español inline,
como el resto de la app). Tailwind v4 + framer-motion, siguiendo el design
system existente.

### Componentes / archivos

1. **NUEVO** `src/features/rules/RulesSheet.tsx`
   - Componente autocontenido. Props: `{ open: boolean; onClose: () => void }`.
   - Envuelve `Sheet` (de `src/ui/Sheet.tsx`) con `title="Cómo se juega"`.
   - Contenido: bloques por categoría (ver abajo), con `Chip` para los valores de
     puntos y animación de entrada `stagger` / `fadeUp` (de `src/ui/motion.ts`),
     respetando `useReduced()`.
   - Se ubica en su propia carpeta `features/rules/` para poder reusarlo luego
     desde el botón muerto `¿Cómo se juega?` que ya existe en
     `src/features/onboarding/Welcome.tsx` (esa segunda entrada queda **fuera de
     scope** ahora).

2. **EDIT** `src/features/home/components/DashboardHeader.tsx`
   - Nuevo estado local `rulesOpen`.
   - En el dropdown del avatar, agregar un `<button>` "Cómo se juega" (ícono
     `Question` o `BookOpen` de `@phosphor-icons/react`) encima de "Cerrar
     sesión". Al pulsar: cierra el dropdown (`setMenu(false)`) y abre el sheet
     (`setRulesOpen(true)`).
   - Renderizar `<RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />`.

3. **EDIT** `src/mocks/scoring.ts`
   - `PRIZES` pasa de `[700_000, 250_000, 50_000]` a `[500_000, 200_000, 50_000]`
     para que el podio, el desglose y las reglas muestren lo mismo.

4. **EDIT** `src/mocks/scoring.test.ts`
   - Línea ~14: actualizar la aserción a `[500_000, 200_000, 50_000]`.

5. **EDIT** `src/mocks/handlers/scoreboard.test.ts`
   - Línea ~21: actualizar `expect(body.data[0].prize).toBe(500000)`.

## Contenido del sheet (referencia completa)

Valores tomados de `src/mocks/seed.ts` (scoringParams por defecto) y
`src/mocks/scoring.ts`. **Trade-off conocido:** los valores van hardcodeados en
la copy porque no existe endpoint de scoring-params del lado del participante.
Si el admin cambia los parámetros, esta copy quedaría desactualizada. Para 2026
los valores por defecto son los canónicos, así que es aceptable.

1. **Intro** (1-2 frases): predices todo antes del Mundial; ganas puntos según
   aciertes; gana quien más sume.

2. **Fase de grupos**
   - `+5` por cada equipo en su **posición exacta**.
   - `+2` **crédito parcial**: equipo del grupo ubicado en posición distinta.
   - `+10` **bonus** si el grupo queda perfecto (4/4 exactos).

3. **Mejores terceros**
   - `+5` por cada tercero acertado.

4. **Eliminatorias** (multiplicador por ronda)
   - `+10` acertar **quién avanza**.
   - `+5` **marcador exacto** (adicional).
   - **Multiplicador por ronda:** Dieciseisavos ×1 · Octavos ×2 · Cuartos ×3 ·
     Semifinal ×4 · Tercer puesto ×4 · Final ×5.
   - Ejemplo: acertar quién avanza en la Final = 10 × 5 = **50 pts**.

5. **Triple** (power-up de eliminatorias)
   - Actívalo en hasta **3** partidos.
   - Si aciertas **quién avanza**, ganas un bono extra (×10 por ronda) además de
     los puntos normales; también escala por ronda. (No aplica al marcador
     exacto.)

6. **Pálpitos**
   - **La revelación:** `+8` por cada ronda que avance tu equipo sorpresa.
   - **La decepción:** `−3` por cada ronda que avance el equipo que apostaste a
     que iba a decepcionar (te resta).

7. **Premios y desempate**
   - 🥇 `500.000` · 🥈 `200.000` · 🥉 `50.000` COP.
   - Empate de puntos → gana quien tenga más **marcadores exactos** en
     eliminatorias.

8. **Candados** (nota breve)
   - Grupos, terceros y pálpitos se cierran al iniciar el Mundial.
   - Cada partido de eliminatorias se cierra al empezar.

## Nombres correctos (verificados en la UI actual)

- Categoría de power-ups: **"Pálpitos"** (tab en `MisPronosticos.tsx`).
- Dark horse → **"La revelación"** (`PowerupsPanel.tsx:21`).
- Disappointment → **"La decepción"** (`PowerupsPanel.tsx:28`).
- Triple → **"Triple"** (`EliminatoriasPanel.tsx`).
- Rondas KO → Dieciseisavos / Octavos / Cuartos / Semifinal / Tercer puesto /
  Final (`KoRoundList.tsx:4`).

## Testing

- `RulesSheet`: test de render — abre con `open`, muestra el título y al menos un
  valor de puntos por categoría; cierra al invocar `onClose`.
- Actualizar los dos tests de premios listados arriba.
- `npm test` (vitest run) debe quedar verde; `npm run lint` sin errores.

## Fuera de scope

- Cablear el botón `¿Cómo se juega?` de `Welcome.tsx`.
- Endpoint participante de scoring-params / valores dinámicos.
- Ruta dedicada `/reglas`.
