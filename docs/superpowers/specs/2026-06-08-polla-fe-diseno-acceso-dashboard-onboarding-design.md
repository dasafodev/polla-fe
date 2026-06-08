# Polla Mundial 2026 — Diseño visual (Entrega 2): Acceso, Onboarding y Dashboard

**Fecha:** 2026-06-08
**Estado:** Diseño aprobado en mockups interactivos (visual companion), pendiente de revisión del spec.
**Depende de:** `2026-06-06-polla-fe-frontend-architecture-design.md` (la fontanería: auth cookie+atómico, React Query, MSW, rutas, hooks por feature). Esta entrega le pone **piel** a esa base; no cambia la lógica.

---

## 0. Resumen y alcance

Hoy el front es HTML pelado sobre una lógica completa. Esta entrega introduce el **sistema de diseño** y estiliza el **flujo de entrada**: Login, Signup, Onboarding (bienvenida + paso a paso) y Dashboard, más el **paso de Grupos como baraja tipo Tinder** cableado a la lógica existente.

**En alcance (Entrega 2):**
1. **Base de diseño:** Tailwind + tokens (color/tipografía/radios/sombras/motion), fuentes, App Shell + nav inferior, primitivas (Button, Card, Field, Chip, ProgressRing, Avatar, Stamp, PhoneSafeArea), capa de motion (Framer Motion + `prefers-reduced-motion`).
2. **Acceso:** `Login` (mundo navy "Noche de marca") y `Signup` (sub-estado, claro).
3. **Onboarding:** `Welcome` (navy, celebración) + **armazón del paso a paso** (header de progreso segmentado, navegación entre pasos, estados, footer fijo) + pantalla de cierre con confeti.
4. **Grupos (paso 1) — baraja Tinder:** interacción completa y **cableada** a los hooks de grupos existentes (`useGroups`, `useMyGroupPredictions`, `useSaveGroupPredictions`).
5. **Dashboard:** centro con tarjeta de progreso (anillo), stepper de pasos en vivo, premios, nav inferior.

**Diferido (Entrega 3+):** formularios de **Terceros** y **Powerups** (en esta entrega quedan como pasos del armazón con estado/empty state, sin formulario final), **Eliminatorias/KO**, **Tabla/Breakdown**, **Amigos**, **Admin**. Todos reutilizarán el sistema de diseño y el armazón del wizard.

**No-objetivos:** cambiar contratos/lógica/auth; backend real; pagos.

---

## 1. Dirección visual

- **Tema base claro y legible (dirección B)** con **momentos navy inmersivos** en los hitos de marca (Login, Welcome, tarjeta de progreso del Dashboard). El contenido y los formularios son **siempre claros**.
- **Marca:** derivada del `logo.png` (copa violeta sobre azul noche). El logo se usa como app-icon (tile redondeado) sobre claro y como medallón con halo sobre navy.
- **Audiencia:** ~20 personas, varias mayores, **90% móvil** → **mobile-first**, letra grande, tap targets generosos, copy claro en español, **una sola acción primaria por pantalla**.

### 1.1 Paleta (tokens)

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F5F4FA` | Fondo de la app (claro, tinte violeta) |
| `surface` | `#FFFFFF` | Tarjetas, inputs |
| `surface-2` | `#FBFAFE` | Superficies sutiles / hover |
| `ink` | `#1A1735` | Texto principal (navy) |
| `ink-soft` | `#5C5878` | Texto secundario |
| `muted` | `#9A96B8` | Texto terciario / iconos inactivos |
| `border` | `#E7E4F2` | Bordes 1px |
| `violet` | `#6D3BD6` | **Acción primaria** (botones, activo, foco) |
| `violet-strong` | `#5A28BF` | Pressed/hover de acción |
| `violet-light` | `#8B6DFF` | Acentos sobre navy, anillo de progreso |
| `tint` | `#EEE8FD` | Fondo de chips/estados activos |
| `navy` | `#120F29` | Fondo de momentos inmersivos |
| `navy-2` | `#1A1540` | Capa media del degradado navy |
| `success` | `#1C8A5B` | Éxito / guardado / grupo completo |
| `lock` | `#B45309` | Candado / bloqueado |
| `danger` | `#C0362C` | Error |
| `gold` | `#B8862E` | **Solo** premios/podio |

Reglas: **un solo color de acento** (violeta) para acciones; los semánticos (success/lock/danger) solo comunican estado; **gold exclusivo de premios**. Sin negro puro. Sombras tintadas a navy (`rgba(20,18,46,…)`), nunca glow neón.

### 1.2 Tipografía

- **Display/títulos:** `Outfit` (700–900), `tracking` ligeramente negativo.
- **Cuerpo/UI:** `Hanken Grotesk` (400–600), `line-height` ~1.5, ancho de lectura ≤ ~30ch en móvil.
- **Números** (puntos, marcadores, posición, conteo, %): `JetBrains Mono` (600–700), tabular.
- Carga vía `@fontsource` (self-host, sin FOUT de terceros) o Google Fonts `<link>` con `display=swap`. **Decisión:** `@fontsource/outfit`, `@fontsource/hanken-grotesk`, `@fontsource/jetbrains-mono` (self-host, offline-friendly).

Escala móvil (rem): display-xl 34–40 / h1 25–27 / h2 20 / body 15–16 / small 12.5–13.

### 1.3 Forma y elevación

- Radios: contenedores grandes `rounded-[24px]`/`28px`, tarjetas `20–22px`, controles `14–16px`, chips `999px`.
- Sombras "difusión" tintadas a navy: ej. `0 24px 50px -24px rgba(26,21,64,.45)`. Glass (solo navy): borde interior `inset 0 1px 0 rgba(255,255,255,.25)` + `backdrop-blur`.
- Grano fino opcional: pseudo-elemento fijo `pointer-events-none` (SVG `feTurbulence`), nunca sobre contenedores con scroll.

### 1.4 Iconografía

- `@phosphor-icons/react` (o SVGs propios), `strokeWidth` estandarizado **2.0**. **Sin emojis.**
- Banderas: por ahora SVG de 2 franjas por color (placeholder); más adelante set real de banderas. Avatares: iniciales sobre degradado de marca (sin "egg" genérico).

---

## 2. Filosofía de motion ("máximo espectáculo" + accesible)

Framer Motion. Física de resorte (`type:"spring", stiffness:~120, damping:~18`), **sin easing lineal**. Animar **solo `transform`/`opacity`**.

Patrones por pantalla:
- **Entrada de pantalla:** orquestación escalonada (`staggerChildren`).
- **Login/Welcome:** aurora violeta que respira (loop), halo del trofeo, partículas/confeti, entrada con resorte, parallax sutil del logo al inclinar (deviceorientation/pointer).
- **Dashboard:** anillo de progreso que se **dibuja** (stroke-dashoffset), count-up del %, stepper con `layout`, dots "en vivo".
- **Baraja de grupos:** drag de la carta (swipe), reorden con `layout`/`layoutId`, sellos LISTO/VOLVER por umbral, cartas asomando, confeti en cierre.
- **Táctil:** `:active` → `scale(.98)`/`translateY(1px)` en todo lo presionable.

**Accesibilidad del movimiento (obligatorio):** un hook `useReducedMotion()` (Framer) desactiva loops/parallax/confeti y reduce transiciones a fades cortos cuando el SO pide `prefers-reduced-motion`. Las animaciones perpetuas se aíslan en componentes cliente memoizados (`React.memo`) para no re-renderizar el layout.

---

## 3. Stack, dependencias y estructura

### 3.1 Dependencias nuevas (verificación obligatoria — hoy NO están en `package.json`)

```
npm install -D tailwindcss @tailwindcss/vite
npm install framer-motion @phosphor-icons/react
npm install @fontsource/outfit @fontsource/hanken-grotesk @fontsource/jetbrains-mono
```

- **Tailwind v4** con el plugin oficial de Vite (`@tailwindcss/vite`) y **config CSS-first** (`@theme` en `src/styles/theme.css`), no `tailwind.config.js` salvo necesidad. Guarda T4: no usar el plugin `tailwindcss` en PostCSS.
- En `vite.config.ts`: añadir `tailwindcss()` a `plugins` (junto a `react()`), sin tocar `server.proxy` ni la config de Vitest. Mantener `test.css:false`.

### 3.2 Estructura (se añade a la existente, no la reescribe)

```
src/
  styles/
    theme.css            # @import tailwind; @theme con TODOS los tokens (color/font/radio/sombra)
    fonts.css            # imports de @fontsource
  ui/                    # sistema de diseño (primitivas, sin lógica de dominio)
    Button.tsx  Card.tsx  Field.tsx  Chip.tsx  Avatar.tsx
    ProgressRing.tsx  SegmentedProgress.tsx  Stamp.tsx
    PhoneFrame? (no)     # la app es la pantalla; nada de marco de teléfono en prod
    motion.ts            # variants compartidos + helper useReduced()
    Backdrop.tsx         # aurora/mesh + grano (navy y claro) aislado y memoizado
  app/
    AppShell.tsx         # reescrito: layout + <BottomNav/> + safe-areas + estado de carga
    BottomNav.tsx        # nav inferior con etiquetas (dock-style), activo en violeta
  features/
    onboarding/
      Login.tsx          # reescrito (navy "Noche de marca")
      Signup.tsx         # reescrito (claro)
      Welcome.tsx        # NUEVO (navy, celebración) — primer ingreso
      OnboardingLayout.tsx # NUEVO armazón del wizard (header progreso + footer fijo + nav pasos)
      onboardingState.ts   # NUEVO: deriva pasos/progreso desde los hooks de dominio
    home/
      Dashboard.tsx      # reescrito (hero progreso + stepper + premios)
    groups/
      GroupDeck.tsx      # NUEVO: baraja Tinder (usa los hooks existentes de groups)
      GroupCard.tsx      # NUEVO: carta de un grupo con reorden
      (GroupsList/GroupEditor existentes quedan; GroupDeck es la nueva entrada del paso)
  main.tsx               # importar styles/theme.css + fonts.css
```

`main.tsx` importa `./styles/theme.css` y `./styles/fonts.css`. Las primitivas en `ui/` no conocen dominio; los componentes de feature componen primitivas + hooks.

---

## 4. Especificación por pantalla

Todas: mobile-first (1 columna, `px-5`, `min-h-[100dvh]`, safe-areas iOS), una acción primaria, estados loading/empty/error.

### 4.1 Login — `features/onboarding/Login.tsx` (navy "Noche de marca")
- Fondo navy con **aurora** violeta (loop) + grano; trofeo (logo) con **halo** y chispas ascendentes.
- Wordmark Outfit 900 ("POLLA / MUNDIAL", segunda palabra en contorno), tagline en lavanda.
- Botón **glass** "Continuar con Google" (envuelve `<GoogleLogin>` de `@react-oauth/google`; mantener su `onSuccess/onError` actuales). "Solo por invitación" + enlace "¿Cómo funciona la polla?".
- **Estados:** `login.isPending` → botón en loading (shimmer); `onError`/`message` → texto inline (rol alert) en lavanda/danger; éxito → "Redirigiendo…" con transición a `/`.
- Conserva la lógica: si `USER_NOT_FOUND` → muestra `Signup`; credential en memoria.

### 4.2 Signup — `features/onboarding/Signup.tsx` (claro, sub-estado de Login)
- Header "Ya casi estás dentro" + lead. Dos `Field`: **Código de invitación** y **Teléfono (WhatsApp)**, etiqueta grande sobre input, helper debajo, error debajo (validación E.164 existente). Campo activo iluminado en violeta.
- CTA violeta "Crear cuenta" (full width). `signup.isPending` → loading. `INVALID_GOOGLE_TOKEN` → vuelve a Login (lógica actual, `onNeedRelogin`).

### 4.3 Onboarding — Welcome — `Welcome.tsx` (navy, primer ingreso)
- Solo la **primera vez** (cuando el participante aún no ha completado nada). Celebración: confeti con física, halo, saludo "¡Estás dentro, {nombre}!", subcopy, los **3 pasos** en pills escalonadas.
- CTA blanco "Empezar" → entra al wizard (paso 1, Grupos). Ghost "¿Cómo se juega?" → hoja informativa (puede ser estática en esta entrega).
- "Primera vez" se deriva del progreso (ver 4.5). No requiere flag nuevo de backend.

### 4.4 Onboarding — Armazón del wizard — `OnboardingLayout.tsx` (claro)
- **Header:** botón atrás + **progreso segmentado** (3 segmentos: Grupos/Terceros/Powerups; el de Grupos puede mostrar parcial). Kicker "PASO n DE 3 · {SECCIÓN}", título y explicación amable, chip de "Ganas hasta +X pts".
- **Body:** contenido del paso (paso 1 = GroupDeck; pasos 2 y 3 = **empty state** explicativo con CTA "Próximamente / Continuar" en esta entrega).
- **Footer fijo:** acción primaria del paso + "Guardar y salir" (vuelve al Dashboard).
- Navegación entre pasos vía estado del wizard; permite volver atrás. Respeta candado global (si `PREDICTIONS_LOCKED`, muestra estado bloqueado e inputs deshabilitados, sin recalcular candados — consume flags del server).

### 4.5 Estado de onboarding — `onboardingState.ts`
Deriva, **sin endpoints nuevos**, desde los hooks existentes:
- Grupos: `useMyGroupPredictions().completedGroups` (0–12).
- Terceros: `useThirds().selectedCount` (meta 8, habilitado si 12 grupos completos).
- Powerups: `usePowerups()` (ambos elegidos o no).
- **% global** y "siguiente paso pendiente" para el Dashboard y el CTA "Continuar donde quedé". "Primera vez" = todo en cero.

### 4.6 Grupos — Baraja Tinder — `GroupDeck.tsx` + `GroupCard.tsx`
Entrada del **paso 1**. Reemplaza, para el flujo onboarding, la edición grupo-por-grupo cruda.
- **Datos:** `useGroups()` (catálogo) + `useMyGroupPredictions()` (ranking guardado por grupo). Cada carta = un grupo con sus 4 equipos en el orden actual (guardado o por defecto).
- **Reordenar:** arrastrar un equipo (Framer `Reorder`/`layout`) → posiciones 1–4 se actualizan; 1° y 2° resaltados (badge violeta). **Sin** línea "clasifican".
- **Avanzar/volver:** **deslizar** la carta (umbral ~90px) → sello **LISTO** (siguiente) / **VOLVER** (anterior); **o** botones grandes "Anterior / Siguiente" (accesible). Cartas asomando detrás (peek). Dots de progreso (12) tocables para saltar.
- **Guardado:** al confirmar un grupo (swipe/botón) → `useSaveGroupPredictions()` con el ranking de ese grupo (POST upsert; la lógica ya hace cascada a terceros). Optimista no; invalida en `onSuccess` (como define la Entrega 1). Manejar `PREDICTIONS_LOCKED` (423 → bloqueo) e `INVALID_RANKINGS` (inline).
- **Cierre:** al confirmar el grupo 12 → pantalla de celebración (confeti) "¡12 grupos listos!" → "Continuar a Terceros".
- **Accesibilidad:** el gesto es **opcional** (botones equivalentes siempre presentes); reorden operable con controles ↑/↓ por fila además de drag; respeta `prefers-reduced-motion` (sin fling/confeti, transición corta).
- **Estados:** loading (skeleton de carta), error de carga (reintentar), candado (carta en modo solo-lectura + aviso).

### 4.7 Dashboard — `features/home/Dashboard.tsx` (claro)
- **Top:** "Hola, {nombre}" + subcopy de candado ("Faltan N días para el cierre", desde flags del server / `tournamentStartAt`); avatar de iniciales (abre menú con **Cerrar sesión** — usa `useLogout` actual).
- **Hero (navy):** etiqueta "TU POLLA", titular de estado ("Casi lista"/"¡Completa!"), subcopy del pendiente, **anillo de progreso** (% de 4.5) que se dibuja, CTA "Continuar donde quedé" → wizard en el paso pendiente.
- **Stepper "Completa tu polla":** filas Grupos / Terceros / Powerups con icono, estado en vivo (chip "En curso", "Pendiente", "Completo" con check success), mini-barra (grupos), chevron. Tap → paso correspondiente. Terceros muestra "Disponible al terminar grupos" si aplica.
- **Premios:** tarjeta oro con bolsa y podio (700k/250k/50k). Tap → detalle (puede diferirse).
- **Nav inferior:** Inicio / Predicciones / Tabla (+ Admin si `role==='admin'`), **con etiquetas**, activo en violeta.
- **Post-cierre (cuando arranque el torneo):** el hero puede mostrar posición/puntos (Tabla) en vez de progreso. En esta entrega se diseña el estado pre-cierre como principal; el post-cierre se contempla en el layout pero su data (scoreboard) llega en Entrega 3.
- **Estados:** loading (skeletons del hero/stepper), `participant` aún cargando (shell de carga), error/red (mensaje + reintentar; no expulsa — alineado con Entrega 1).

### 4.8 App Shell + Nav — `AppShell.tsx` + `BottomNav.tsx`
- Layout con `min-h-[100dvh]`, padding inferior para la nav flotante, safe-areas. Estado de carga mientras `/me` resuelve. `BottomNav` dock-style; el item activo se infiere de la ruta.

---

## 5. Accesibilidad y usabilidad (personas mayores)

- Contraste AA: texto `ink` sobre `bg`/`surface` (>7:1); botón violeta con texto blanco (>4.5:1).
- Tap targets ≥ 48–52px; tipografía base ≥ 16px en formularios (evita zoom iOS).
- Etiquetas siempre visibles (label sobre input; nav con texto, no solo iconos).
- Gestos siempre con alternativa por botón. Foco visible (anillo violeta). `aria-live` para errores/guardados. Soporte `prefers-reduced-motion`.

---

## 6. Riesgos y decisiones abiertas (confirmar en revisión)

1. **Tailwind v4** (CSS-first) vs v3 (config JS). Propuesto: **v4 + plugin Vite**. Si prefieres v3, se ajusta.
2. **Alcance de Grupos:** el GroupDeck se entrega **cableado** a la lógica existente; **Terceros y Powerups** quedan como pasos con empty state (sus formularios llegan en Entrega 3). Confirmar que es el corte deseado.
3. **Fuentes self-host** (`@fontsource`) vs Google Fonts CDN. Propuesto: self-host.
4. **Tests:** estas pantallas son visuales; se mantienen los tests de lógica existentes (no romperlos). Se añaden tests de comportamiento donde aporta (GroupDeck: guardar grupo invalida queries; onboardingState: derivación de %). Sin snapshots de estilo.
5. **Premios:** montos `700k/250k/50k` provienen de la lógica (scoreboard prize); el copy "Bolsa $1.000.000" se deriva, no se hardcodea si hay fuente.

---

## 7. Criterios de éxito

- `npm run dev` con `VITE_USE_MOCKS=true` muestra Login navy → (dev-bypass o Google) → Welcome → wizard con **baraja de grupos funcional que guarda** → Dashboard con progreso real derivado de los hooks.
- Cero regresiones: los tests de lógica existentes siguen verdes; `tsc` y `eslint` limpios.
- Mobile-first real (probado a 360–390px), tap targets y contraste correctos, `prefers-reduced-motion` respetado.
- Sistema de diseño reutilizable: Terceros/Powerups/KO/Tabla podrán construirse encima sin rediseñar tokens ni primitivas.
