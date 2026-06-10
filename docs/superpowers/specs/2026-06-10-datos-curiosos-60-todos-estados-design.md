# Datos curiosos: 60 datos y presencia en todos los estados del Inicio

**Fecha:** 2026-06-10
**Estado:** Aprobado el diseño; pendiente revisión del spec.

## Objetivo

Dos cambios en la pantalla de Inicio (`src/features/home`):

1. **Ampliar el set de datos mundialistas de 30 a 60.** Los 30 nuevos (ids 31–60) los investiga y valida un subagente Opus.
2. **Mostrar el `FunFactCard` en todos los estados del Inicio excepto `loading`.** Hoy solo aparece en `empty` y `progress`; debe aparecer también en `ready` y `live`.

## Contexto actual

- **Datos:** `src/features/home/data/funFacts.ts` — 30 datos `FunFact { id, text, source, url }`. Helper `pickRandomFact()` (random por montaje).
- **Card:** `src/features/home/components/FunFactCard.tsx` — muestra el `text` (no muestra `source`/`url`). Elige un dato aleatorio una vez por montaje.
- **Estados:** `src/features/home/homeView.ts` decide entre `loading | empty | progress | ready | live`. `Dashboard.tsx` hace el switch.
  - Hoy el `FunFactCard` está inline en `EmptyHome.tsx` e `InProgressHome.tsx` (último elemento, dentro del contenedor `stagger`, envuelto en `motion.div variants={fadeUp}`).
  - `ReadyHome.tsx` termina en `StarBets`; `LiveHome.tsx` termina en `PalpitosBar`. Ninguno muestra el dato.
  - `LiveHome` tiene un skeleton interno propio (`useLiveHome().loading`), distinto del `loading` global del Dashboard.

## Decisiones

- **Estados:** el dato va en `empty`, `progress`, `ready`, `live`. El estado `loading` (skeleton global) **no** lo lleva.
- **Estructura de datos:** se mantiene `{ id, text, source, url }`. La regla de "≥2 fuentes" es un filtro de validación durante la investigación; **no** se almacena el segundo origen.
- **Datos existentes:** los 30 actuales (ids 1–30) se conservan tal cual. Solo se investigan y validan 30 nuevos.

## Diseño

### 1. Render — Opción A: subir el `FunFactCard` al Dashboard

Garantiza por estructura que ningún estado (presente o futuro) se quede sin el dato; no depende de recordar agregarlo en cada estado.

- `Dashboard.tsx`: después del switch de vistas, dentro del contenedor `space-y-5`, renderizar:
  ```tsx
  {view !== 'loading' && (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <FunFactCard />
    </motion.div>
  )}
  ```
- Eliminar `<FunFactCard />` y su import de `EmptyHome.tsx` e `InProgressHome.tsx` (queda como único dueño el Dashboard).
- El dato anima con su propio `fadeUp` independiente (pierde el _stagger_ coordinado por estado). Visualmente sigue siendo el último elemento de la pantalla, igual que hoy.
- En `live`, mientras corre su skeleton interno, el dato igual se muestra debajo (relleno agradable de la espera). El único estado realmente sin dato es el `loading` global.

### 2. Datos — 30 → 60 vía subagente Opus

- **Subagente:** un subagente con modelo **Opus** investiga **30 datos nuevos** (ids 31–60).
- **No duplicar:** se le entrega la lista de los 30 datos existentes; los nuevos deben ser distintos en hecho/tema.
- **Tono y formato:** español, 1–2 frases, conciso y atractivo; misma mezcla temática que el set actual (récords, historia, Mundial 2026, Colombia, curiosidades). Mismo registro de redacción.
- **Regla de validación (dura):** cada dato debe estar respaldado por **≥2 fuentes independientes y reputadas que afirmen lo mismo**. El subagente devuelve, por dato:
  - `text` (en español)
  - `source` (nombre de la fuente primaria) y `url` (de la fuente primaria)
  - `sources`: lista de ≥2 `{ name, url }` para auditoría
- **Auditoría:** se revisa que cada dato tenga ≥2 fuentes concordantes. Se **descarta** cualquier dato que no lo cumpla; si quedan menos de 30, se vuelve a iterar con el subagente hasta completar 30 validados.
- **Persistencia:** se guarda solo `{ id, text, source, url }` (la fuente primaria). El campo `sources` de auditoría no se almacena en el código.
- Actualizar el comentario de cabecera de `funFacts.ts` para reflejar 60 datos y que se muestran en todos los estados menos `loading`.

### 3. Tests

- `FunFactCard.test.tsx`: sigue válido con 60 datos (usa `FUN_FACTS[0]` y `FUN_FACTS[length-1]`). Sin cambios necesarios.
- `Dashboard.test.tsx` / `homeView`: añadir cobertura de que `ready` y `live` muestran "Dato mundialista" y que `loading` no. (Si requiere mocks pesados de `useLiveHome`/onboarding, basta con un test enfocado al render condicional del Dashboard.)
- `pnpm test` (o el runner del repo) debe pasar; `pnpm build`/typecheck sin errores.

## Fuera de alcance

- No se cambia la estructura `FunFact` (no se añaden campos de fuentes secundarias).
- No se re-validan los 30 datos existentes.
- No se cambia la lógica de selección aleatoria ni el diseño visual del card.
- El estado `loading` global sigue siendo solo skeleton.
