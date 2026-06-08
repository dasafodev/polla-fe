# Polla Mundial 2026 — Diseño visual (Entrega 3): Terceros y Powerups

**Fecha:** 2026-06-08
**Estado:** Diseño aprobado en mockups interactivos (visual companion), pendiente de revisión del spec.
**Depende de:** `2026-06-08-polla-fe-diseno-acceso-dashboard-onboarding-design.md` (Entrega 2: sistema de diseño, tokens, primitivas, armazón del wizard, `GroupDeck`). Esta entrega completa los **pasos 2 y 3 del wizard** reutilizando ese sistema; no cambia la lógica de dominio.

---

## 0. Resumen y alcance

La Entrega 2 dejó cableado el paso 1 (Grupos, baraja tipo Tinder) y los pasos 2 (Terceros) y 3 (Powerups) como `StepPlaceholder` (empty states sin formulario). Esta entrega **reemplaza esos placeholders por las pantallas reales y cableadas**, y de paso estiliza las rutas standalone `/predicciones/terceros` y `/predicciones/powerups` (hoy HTML pelado) reutilizando los mismos componentes.

**En alcance (Entrega 3):**
1. **Terceros — selección de los 8 mejores:** grilla de tarjetas (2 columnas) cableada a `useThirds` / `useSaveThirds`, con contador "n de 8" + 8 pips, tope de 8, y estados loading/error/candado/deshabilitado.
2. **Powerups — caballo oscuro + decepción:** dos tarjetas temáticas que abren un bottom-sheet de selección de equipo (`TeamPickerSheet`), cableadas a `useGroups` / `usePowerups` / `useSavePowerups`, con modo create/update y estados loading/candado.
3. **Primitiva `Sheet`** (bottom-sheet genérico) y `WizardFooter` (footer fijo compartido) reutilizables.
4. **Cierre del wizard:** pantalla de celebración con confeti al guardar Powerups ("¡Tu polla está lista!").
5. **Reutilización standalone:** los mismos componentes sirven en `/predicciones/terceros` y `/predicciones/powerups`, eliminando las versiones crudas (`Thirds.tsx` y `PowerupsForm.tsx` actuales).

**No-objetivos:** cambiar contratos/lógica/auth ni los hooks de dominio; backend real; pagos. Eliminatorias/KO, Tabla/Breakdown, Amigos y Admin siguen diferidos.

---

## 1. Dirección visual

Se reutiliza íntegro el sistema de la Entrega 2: tema claro/legible con momentos navy, **un solo acento violeta** para acciones, semánticos solo para estado, **gold exclusivo de premios**, tipografía Outfit/Hanken/JetBrains Mono, radios y sombras tintadas a navy. Mobile-first, tap targets ≥48px, copy claro en español, **una sola acción primaria por pantalla** (regla confirmada por el usuario en la Entrega 2).

**Decisiones visuales aprobadas en mockups:**
- **Terceros:** grilla de **tarjetas en 2 columnas** (no lista de 1 columna). Cada tarjeta: bandera placeholder (gradiente, `aria-hidden`) + nombre (Outfit) + "Grupo X" + check; seleccionada = borde violeta + fondo `tint` + badge check.
- **Powerups:** dos tarjetas temáticas — **Caballo oscuro** en violeta (`tint`/violet), **La decepción** en ámbar (familia `lock`, `#fdeede`/`lock`); el gold queda reservado a premios. La selección de equipo se hace en un **bottom-sheet** con buscador (no desplegable en línea).

---

## 2. Arquitectura y estructura de archivos

```
src/
  ui/
    Sheet.tsx              # NUEVO: bottom-sheet genérico (slide-up, scrim, grab, Esc/backdrop, reduced-motion)
  features/
    onboarding/
      OnboardingLayout.tsx # EDIT: renderiza Thirds/Powerups; elimina el footer global hardcodeado
      WizardFooter.tsx     # NUEVO: footer fijo compartido (barra blur + max-w-[480px])
      StepPlaceholder.tsx  # BORRAR: queda sin uso
    groups/
      Thirds.tsx           # REESCRITO: grilla de terceros cableada (conserva nombre de export)
    powerups/
      Powerups.tsx         # REESCRITO+RENAME (de PowerupsForm.tsx): tarjetas temáticas + sheet
      TeamPickerSheet.tsx  # NUEVO: Sheet + lista single-select con buscador
  app/
    router.tsx             # EDIT: actualizar import por el rename de Powerups
```

Las primitivas de `ui/` no conocen dominio. `Thirds` y `Powerups` componen primitivas + hooks de dominio. Se conservan los nombres de export (`Thirds`) o se actualizan los imports (`Powerups`) para no romper el router.

---

## 3. Modelo de CTA y modos (regla "un solo CTA")

Cada paso cableado es **mode-aware** según reciba o no la prop `onComplete`:

- **Modo wizard** (`onComplete` presente): el paso renderiza su propio **footer fijo** (`WizardFooter`) con el contador (Terceros) y un **único CTA que guarda y avanza**:
  - Terceros: "Guardar y continuar" → `onComplete()` avanza a Powerups.
  - Powerups: "Activar powerups" → tras guardar, muestra la celebración de cierre.
  - `OnboardingLayout` deja de renderizar su footer global; solo reserva el padding inferior (`pb-[calc(96px+env(safe-area-inset-bottom))]`) para los pasos con footer.
- **Modo standalone** (`/predicciones/...`, sin `onComplete`): el mismo bloque contador+CTA pero **inline** al final del contenido (no fijo), para no chocar con la nav inferior del `AppShell`. Al guardar muestra "Guardado" (`aria-live`) y se mantiene en la pantalla. En este modo el componente renderiza también su propio título/intro (en wizard el header lo aporta `OnboardingLayout`).

El paso de Grupos (`GroupDeck`) no cambia: mantiene su navegación inline ya aprobada en la Entrega 2.

---

## 4. Especificación por pantalla

### 4.1 Terceros — `features/groups/Thirds.tsx`

- **Datos:** `useThirds()` → `data.data: ThirdCandidate[]` (hasta 12, uno por grupo; cada candidato: `teamId`, `name`, `code`, `label` (letra del grupo), `selected`). `useSaveThirds()` → `POST /groups/thirds { teamIds: string[] }` (el server exige exactamente 8 candidatos válidos).
- **Estado local:** `picked: string[] | null` (`null` = usa la selección del server; `[]` = el usuario deseleccionó todo, estado válido). `selected = picked ?? serverSelected`.
- **Interacción:** grilla 2 columnas de tarjetas tocables (toggle). **Tope de 8:** al llegar a 8, las tarjetas no seleccionadas se atenúan/deshabilitan (para cambiar, se quita una). El CTA se habilita **solo en exactamente 8**. Contador "n de 8 elegidos" + 8 pips que se llenan.
- **Guardado:** CTA → `save.mutate({ teamIds: selected })`.
  - `onSuccess`: wizard → `onComplete()`; standalone → mensaje "Guardado".
  - `onError` (`isApiError`): `PREDICTIONS_LOCKED` → estado candado; `INVALID_*` → alerta inline (`role="alert"`).
- **Estados:**
  - **loading:** skeleton de grilla (`animate-pulse`).
  - **error de carga:** card + "Reintentar" (`refetch`).
  - **candado** (`PREDICTIONS_LOCKED` / torneo iniciado): grilla solo-lectura, CTA oculto/deshabilitado, aviso `text-lock`.
  - **deshabilitado / <8 candidatos** (grupos incompletos): empty state "Completa los 12 grupos primero", sin grilla. (En el wizard, `OnboardingLayout` ya deshabilita la navegación a este paso vía `state.steps[1].status`.)

### 4.2 Powerups — `features/powerups/Powerups.tsx` + `TeamPickerSheet.tsx`

- **Datos:** `useGroups()` → equipos; `notTop8 = teams.filter(t => !t.isTop8)` (caballo oscuro, ~40), `top8 = teams.filter(t => t.isTop8)` (decepción, 8). `usePowerups()` → `darkHorse` / `disappointment` guardados. `useSavePowerups(mode)` → `POST` (create) / `PUT` (update) `{ darkHorseTeamId, disappointmentTeamId }`.
- **Estado local:** `darkHorse: string|null`, `disappointment: string|null` (`null` = valor del server). `hasPowerups = !!(mine.darkHorse || mine.disappointment)` → `mode = hasPowerups ? 'update' : 'create'`.
- **Interacción:** dos tarjetas temáticas. Tocar una abre `TeamPickerSheet` con el pool correcto (notTop8 / top8), selección actual resaltada, filtro por nombre; elegir fija el estado local y cierra la hoja. Copy de mecánica en cada tarjeta ("suma puntos por cada ronda que avanza" / "que cae antes").
- **Guardado:** CTA "Activar powerups" habilitado con ambos elegidos → `save.mutate({ darkHorseTeamId, disappointmentTeamId })`.
  - `onSuccess`: wizard → celebración de cierre; standalone → "Guardado".
  - `onError` inline.
- **Estados:** loading; candado (tarjetas solo-lectura mostrando lo elegido, CTA deshabilitado, aviso).

### 4.3 Cierre del wizard (confeti)

Reutiliza `Confetti` (ya respeta `prefers-reduced-motion`) con el patrón `done` de `GroupDeck`. Estado local `done` en `Powerups` (solo modo wizard): titular **"¡Tu polla está lista!"**, subcopy breve, y **un único CTA "Ir al inicio"** → `onComplete()` (`nav('/')`).

### 4.4 Primitiva `Sheet` — `ui/Sheet.tsx`

Bottom-sheet genérico, sin dominio: scrim (`rgba(18,15,41,.45)`), panel `rounded-[24px]` que entra desde abajo con resorte (Framer Motion), grab handle, `max-height` ~78%, contenido scrollable. Cierra con Esc y tap en backdrop. Mueve el foco al panel al abrir. Con `useReduced()` aparece sin animación. Props: `open`, `onClose`, `title?`, `children`.

### 4.5 `WizardFooter` — `features/onboarding/WizardFooter.tsx`

Extrae el chrome del footer fijo que hoy vive inline en `OnboardingLayout`: barra `fixed inset-x-0 bottom-0` con `border-t`, `bg-surface/95`, `backdrop-blur`, safe-area inferior y wrapper `max-w-[480px]`. Recibe `children` (contador + CTA del paso).

---

## 5. Motion y accesibilidad

- Tarjeta al elegir: `:active` → `scale(.98)`; check entra con fade/spring. Pips se llenan con transición corta. Sheet: slide-up con resorte + scrim fade; **reduced-motion → aparición instantánea**. Confeti desactivado con reduced-motion.
- Tap targets ≥48px; tipografía ≥16px en controles (evita zoom iOS). Banderas como gradiente placeholder (`aria-hidden`), igual que `GroupCard`.
- Sheet: cierra con Esc/backdrop, foco al panel al abrir. `aria-live` en mensajes de guardado/error. Contador anunciado ("n de 8 elegidos"). Foco visible (anillo violeta). Contraste AA.

---

## 6. Pruebas

Siguiendo el patrón existente (`renderWithProviders`, MSW, `db.currentSessionId` o login vía hook). Sin snapshots de estilo.

- **`Thirds.test.tsx`** (extiende el existente, que ya hace `db.currentSessionId = 'p-juan'`): toggle marca/desmarca; el tope de 8 deshabilita el CTA fuera de exactamente 8; guardar invalida queries y refleja `selectedCount`; estado candado en solo-lectura.
- **`Powerups.test.tsx`** (componente, NUEVO en `features/powerups/`): abrir el sheet; elegir caballo oscuro del pool `notTop8` y decepción del pool `top8`; el CTA se habilita con ambos; guardar en modo create (usuario `p-luis`) y update (usuario `p-juan`).
- `onboardingState` no cambia. Los tests de lógica y de handlers existentes (`groups.test.ts`, `powerups.test.ts`, `onboardingState.test.ts`, `GroupDeck.test.tsx`) siguen verdes. `tsc` y `eslint` limpios.

---

## 7. Criterios de éxito

- Con `VITE_USE_MOCKS=true`: el wizard avanza Grupos → **Terceros (grilla funcional que guarda 8)** → **Powerups (sheet que elige caballo oscuro + decepción y guarda)** → **celebración de cierre** → Dashboard con progreso al 100%.
- `/predicciones/terceros` y `/predicciones/powerups` muestran los mismos componentes estilizados (modo standalone, CTA inline, "Guardado").
- Cero regresiones: tests existentes verdes; `tsc` y `eslint` limpios.
- Mobile-first real (360–390px), tap targets y contraste correctos, `prefers-reduced-motion` respetado.
- `Sheet` y `WizardFooter` quedan como piezas reutilizables para entregas futuras (KO/Tabla).
