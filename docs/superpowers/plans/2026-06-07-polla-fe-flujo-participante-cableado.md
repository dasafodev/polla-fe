# Cableado del flujo participante (mock connection-ready) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar cada pantalla del flujo participante (grupos, terceros, powerups, KO, tabla/scoreboard, breakdown, amigos) **consumiendo su servicio en el mock MSW** con fidelidad completa al contrato, sobre páginas crudas (sin estilos), con tests TDD de handlers + motor de scoring + hooks.

**Architecture:** Se extiende el mock existente (auth ya cableado) con estado en memoria para todo el dominio participante. Un **motor de scoring puro** (`mocks/scoring.ts`) deriva `pointsEarned`/breakdown/scoreboard desde el seed (no hay admin que ingrese resultados en esta tanda). Cada feature trae su `api.ts` (único que conoce rutas) + `hooks.ts` (TanStack Query); las pantallas son bare y solo ejercitan la conexión. Construcción **híbrida**: base compartida (tipos + db + seed + scoring) primero, luego rebanadas verticales por dominio.

**Tech Stack:** React 18, Vite, TypeScript (strict), React Router v6, TanStack Query v5, MSW v2, Vitest + React Testing Library.

**Spec de referencia:** `docs/superpowers/specs/2026-06-06-polla-fe-frontend-architecture-design.md` (§5 tipos/api, §6 estado servidor, §8 routing, §9 mocks, §11 testing, §15 matriz). Contrato: `api-contract.yaml`.

## Context

El Plan 1 (`docs/superpowers/plans/2026-06-06-polla-fe-fundacion-auth.md`) dejó la fundación y **solo el flujo de auth cableado** al mock: `Login`/`Signup`/`Dashboard` consumen `/auth/*` y `/me`. El resto del contrato participante (grupos, terceros, powerups, KO, tabla/scoreboard, breakdown, amigos) **no tiene tipos, ni `api.ts`, ni hooks, ni handlers**: el router solo monta `/login` y `/`, y los links del `AppShell` a `/predicciones` y `/tabla` son links muertos.

El spec exige (línea 28) que *"la capa de datos cablea **todo el contrato** desde Fase A… 'connection-ready' no depende del faseado de UI"*. El usuario pidió explícitamente que **cada navegación consuma su servicio** ("si voy a predicciones, consume el servicio de predicciones"), sin necesidad de UI visual. Este plan cierra esa brecha para **todo el flujo participante**: extiende el mock con estado y fidelidad completa al contrato (candados, cascada, validaciones, triple, scoring), expone cada endpoint, y añade pantallas crudas + rutas para que toda navegación dispare su request real al mock. Admin/health/recálculo quedan fuera (fases posteriores).

**Decisiones de esta tanda (aprobadas):**
- **Alcance:** todo el flujo participante. **Fuera:** admin (8 pantallas), `/health`, recálculo disparado por usuario, estado de pago, optimistic updates, estilos.
- **Fidelidad completa al contrato** en escrituras (candados, cascada, validaciones, triple).
- **Tests:** handlers + motor scoring + hooks (TDD). Pantallas bare sin test.
- **Resultados oficiales** vienen solo del **seed** (estado interno del mock). Admin no participa (D5).
- **Escalas de ronda enteras** (`scale_r32..final` = 1,2,3,4,5) para que `pointsEarned` sea integer sin redondeo.

---

## Estructura de archivos (esta entrega)

```
src/
  types/ enums.ts(MOD) api.ts(MOD)
  mocks/
    db.ts(MOD)               # +teams,groups,*Predictions,koMatches,scoringParams,estado oficial
    seed.ts(MOD)             # seed determinista que ejercita TODAS las ramas
    scoring.ts(NEW)          # motor puro: pointsEarned/breakdown/scoreboard/triple
    scoring.test.ts(NEW)
    handlers/
      _shared.ts(NEW)        # err(tipado) + requireSession + groupsLocked
      auth.ts(MOD)           # usa _shared.err
      groups.ts(NEW) groups.test.ts(NEW)
      powerups.ts(NEW) powerups.test.ts(NEW)
      ko.ts(NEW) ko.test.ts(NEW)
      scoreboard.ts(NEW) scoreboard.test.ts(NEW)
      index.ts(MOD)          # registra todos los handlers
  features/
    groups/ api.ts hooks.ts GroupsList.tsx GroupEditor.tsx Thirds.tsx
    powerups/ api.ts hooks.ts PowerupsForm.tsx
    ko/ api.ts hooks.ts KoRoundList.tsx KoRoundDetail.tsx KoMatchDetail.tsx
    scoreboard/ api.ts hooks.ts Scoreboard.tsx Breakdown.tsx
    predicciones/ Hub.tsx Review.tsx
  app/ router.tsx(MOD) AppShell.tsx(MOD)
```

---

# FASE 1 — Base compartida

## Task 1: Enums y tipos del dominio participante

**Files:**
- Modify: `src/types/enums.ts`
- Modify: `src/types/api.ts`

- [ ] **Step 1: Añadir a `src/types/enums.ts` (al final del archivo)**

```ts
// Escala de ronda KO (enum cerrado del contrato, KoMyPrediction.pointsEarned.scale_slug)
export const SCALE_SLUGS = ['scale_r32', 'scale_r16', 'scale_qf', 'scale_sf', 'scale_final'] as const
export type ScaleSlug = (typeof SCALE_SLUGS)[number]

// Mapa ronda KO → slug de escala. '3rd' reusa scale_sf (el contrato no define scale_3rd).
export const ROUND_TO_SCALE: Record<RoundSlug, ScaleSlug> = {
  r32: 'scale_r32', r16: 'scale_r16', qf: 'scale_qf', sf: 'scale_sf', '3rd': 'scale_sf', final: 'scale_final',
}

// Keys de scoring_params (contrato /admin/scoring-params)
export const SCORING_KEYS = [
  'pts_group_position_exact', 'pts_group_position_partial', 'bonus_group_complete',
  'pts_third_correct', 'pts_ko_advances', 'pts_ko_exact_score',
  'pts_dark_horse_per_round', 'pts_disappointment_per_round', 'mult_triple',
  'scale_r32', 'scale_r16', 'scale_qf', 'scale_sf', 'scale_final',
] as const
export type ScoringKey = (typeof SCORING_KEYS)[number]
export type ScoringParams = Record<ScoringKey, number>
```

- [ ] **Step 2: Añadir a `src/types/api.ts`**

Primero, ampliar el import existente del tope del archivo (línea 1) para no introducir un import a mitad de archivo:

```ts
// ANTES:  import type { Role } from './enums'
import type { Role, RoundSlug, MatchStatus, ScaleSlug } from './enums'
```

Luego añadir al final del archivo (sin repetir el import):

```ts
// ── Catálogo ───────────────────────────────────────────────────────────────
export interface Team { id: string; name: string; code: string; isTop8: boolean }
export interface Group { id: string; label: string; name: string; teams: Team[] }

// ── Grupos: predicciones ─────────────────────────────────────────────────────
export interface GroupRanking { teamId: string; name: string; code: string; isTop8: boolean; position: number }
export interface GroupPointsEarned {
  pts_group_position_exact: number; pts_group_position_partial: number; bonus_group_complete: number; total: number
}
export interface GroupPrediction {
  groupId: string; label: string; name: string; groupComplete: boolean
  rankings: GroupRanking[]; pointsEarned: GroupPointsEarned | null
}
export interface MyGroupPredictions { data: GroupPrediction[]; completedGroups: number }
export interface SaveGroupPredictionsBody {
  predictions: { groupId: string; rankings: { teamId: string; position: number }[] }[]
}
export interface ParticipantPredictions { participant: { id: string; name: string }; predictions: GroupPrediction[] }
export interface FriendsGroups { available: boolean; availableAt?: string; data?: ParticipantPredictions[] }

// ── Terceros ─────────────────────────────────────────────────────────────────
export interface ThirdPointsEarned { pts_third_correct: number; total: number }
export interface ThirdCandidate {
  teamId: string; name: string; code: string; groupId: string; label: string
  selected: boolean; pointsEarned: ThirdPointsEarned | null
}
export interface ThirdsResponse { data: ThirdCandidate[]; selectedCount: number }
export interface SaveThirdsBody { teamIds: string[] }

// ── Powerups ──────────────────────────────────────────────────────────────────
export interface PowerupTeam { teamId: string; name: string; code: string; isTop8: boolean }
export interface PowerupsPointsEarned {
  pts_dark_horse_per_round: number; pts_disappointment_per_round: number
  dark_horse_rounds_advanced: number; disappointment_rounds_advanced: number; total: number
}
export interface MyPowerups {
  darkHorse: PowerupTeam | null; disappointment: PowerupTeam | null; pointsEarned?: PowerupsPointsEarned | null
}
export interface SavePowerupsBody { darkHorseTeamId: string; disappointmentTeamId: string }
export interface FriendPowerups {
  participant: { id: string; name: string }; darkHorse: PowerupTeam | null; disappointment: PowerupTeam | null
}
export interface FriendsPowerups { available: boolean; availableAt?: string; data?: FriendPowerups[] }

// ── KO ──────────────────────────────────────────────────────────────────────
export interface KoTeam { id: string; name: string; code: string }
export interface KoResult { scoreHome: number; scoreAway: number; winnerTeamId: string }
export interface KoPointsEarned {
  pts_ko_advances: number; pts_ko_exact_score: number; mult_triple: number
  scale_factor: number; scale_slug: ScaleSlug; total: number
}
export interface KoMyPrediction {
  scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive: boolean
  lockedIn: boolean; pointsEarned: KoPointsEarned | null
}
export interface KoMatch {
  id: string; externalMatchId: number; matchNumber: number; scheduledAt: string; lockedAt: string
  status: MatchStatus; homeTeam: KoTeam | null; awayTeam: KoTeam | null
  homeTeamLabel: string | null; awayTeamLabel: string | null
  result: KoResult | null; myPrediction: KoMyPrediction | null
}
export interface KoRound { slug: RoundSlug; name: string; order: number }
export interface KoMatchesResponse { round: KoRound; matches: KoMatch[] }
export interface SaveKoPredictionBody {
  scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive?: boolean
}
export interface SaveKoPredictionResponse { ok: boolean; tripleUsesRemaining: number }
export interface FriendKoPrediction {
  participant: { id: string; name: string }
  prediction: { scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive: boolean } | null
}
export interface FriendsKo { available: boolean; matchId: string; availableAt: string | null; data: FriendKoPrediction[] | null }

// ── Scoreboard / breakdown ────────────────────────────────────────────────────
export interface ScoreboardEntry { rank: number; participant: { id: string; name: string }; total: number; prize: number | null }
export interface Scoreboard { updatedAt: string; data: ScoreboardEntry[] }
export interface ScoreBreakdownDetail { groups: number; thirds: number; ko: number; darkHorse: number; disappointment: number }
export interface ScoreBreakdown {
  participant: { id: string; name: string }; total: number
  breakdown: ScoreBreakdownDetail; tripleUsesRemaining: number; prize: number | null
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/types/enums.ts src/types/api.ts
git commit -m "feat: tipos del dominio participante (grupos/terceros/powerups/ko/scoreboard) y enums de scoring"
```

---

## Task 2: Estado del mock (`db.ts`) y seed determinista (`seed.ts`)

**Files:**
- Modify: `src/mocks/db.ts`
- Modify: `src/mocks/seed.ts`

- [ ] **Step 1: Reemplazar `src/mocks/db.ts` por la versión extendida**

```ts
import type { Role, RoundSlug, MatchStatus, ScoringParams } from '../types/enums'

export interface DbParticipant {
  id: string; googleSub: string; name: string; email: string; phone: string | null; role: Role
}
export interface DbInvitation {
  id: string; code: string; usedByParticipantId: string | null; usedAt: string | null; expiresAt: string; createdAt: string
}
export interface DbTeam { id: string; name: string; code: string; isTop8: boolean; groupId: string }
export interface DbGroup { id: string; label: string; name: string; teamIds: string[] }
export interface DbGroupRanking { teamId: string; position: number }
export interface DbGroupPrediction { participantId: string; groupId: string; rankings: DbGroupRanking[] }
export interface DbThirdsSelection { participantId: string; teamIds: string[] }
export interface DbPowerups { participantId: string; darkHorseTeamId: string | null; disappointmentTeamId: string | null }
export interface DbKoRound { slug: RoundSlug; name: string; order: number }
export interface DbKoResult { scoreHome: number; scoreAway: number; winnerTeamId: string }
export interface DbKoMatch {
  id: string; roundSlug: RoundSlug; externalMatchId: number; matchNumber: number
  scheduledAt: string; lockedAt: string; status: MatchStatus
  homeTeamId: string | null; awayTeamId: string | null; homeTeamLabel: string | null; awayTeamLabel: string | null
  result: DbKoResult | null
}
export interface DbKoPrediction {
  participantId: string; matchId: string; scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive: boolean
}

export interface Db {
  currentSessionId: string | null
  participants: DbParticipant[]
  invitations: DbInvitation[]
  tournamentStartAt: string
  teams: DbTeam[]
  groups: DbGroup[]
  groupPredictions: DbGroupPrediction[]
  thirdsSelections: DbThirdsSelection[]
  powerups: DbPowerups[]
  koRounds: DbKoRound[]
  koMatches: DbKoMatch[]
  koPredictions: DbKoPrediction[]
  scoringParams: ScoringParams
  // Estado oficial interno (solo seed; NO expuesto por el contrato participante)
  officialGroupStandings: Record<string, string[]> | null // groupId → [pos1,pos2,pos3,pos4] teamIds
  officialBestThirds: string[] | null                      // 8 teamIds
  teamRoundsAdvanced: Record<string, number> | null        // teamId → rondas KO avanzadas (powerups)
}

export let db: Db = makeEmptyDb()

function makeEmptyDb(): Db {
  return {
    currentSessionId: null, participants: [], invitations: [], tournamentStartAt: '2026-06-11T16:00:00.000Z',
    teams: [], groups: [], groupPredictions: [], thirdsSelections: [], powerups: [],
    koRounds: [], koMatches: [], koPredictions: [],
    scoringParams: {
      pts_group_position_exact: 0, pts_group_position_partial: 0, bonus_group_complete: 0,
      pts_third_correct: 0, pts_ko_advances: 0, pts_ko_exact_score: 0,
      pts_dark_horse_per_round: 0, pts_disappointment_per_round: 0, mult_triple: 0,
      scale_r32: 1, scale_r16: 1, scale_qf: 1, scale_sf: 1, scale_final: 1,
    },
    officialGroupStandings: null, officialBestThirds: null, teamRoundsAdvanced: null,
  }
}

export function setDb(next: Db): void { db = next }
```

- [ ] **Step 2: Reemplazar `src/mocks/seed.ts` por el seed determinista**

> Genera 12 grupos × 4 equipos (8 `isTop8`), 6 rondas KO, partidos r32+r16 (abiertos/finished/locked), y predicciones que ejercitan: 12 grupos completos (juan/maria idénticos), 8 terceros, powerups (juan/maria con / luis sin), desempate (juan/maria empatan en total, juan con más exactos KO), triple agotado (pedro), invitaciones disponible/usado/expirado. Escalas enteras.

```ts
import { setDb, type Db, type DbTeam, type DbGroup, type DbKoMatch } from './db'
import type { ScoringParams } from '../types/enums'

const GROUP_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const
// 8 top8 = el equipo "1" de los primeros 8 grupos
const TOP8 = new Set(['tA1', 'tB1', 'tC1', 'tD1', 'tE1', 'tF1', 'tG1', 'tH1'])

function buildCatalog(): { teams: DbTeam[]; groups: DbGroup[] } {
  const teams: DbTeam[] = []
  const groups: DbGroup[] = []
  for (const L of GROUP_LABELS) {
    const groupId = `g-${L}`
    const teamIds: string[] = []
    for (let i = 1; i <= 4; i++) {
      const id = `t${L}${i}`
      teams.push({ id, name: `Equipo ${L}${i}`, code: `${L}${i}`, isTop8: TOP8.has(id), groupId })
      teamIds.push(id)
    }
    groups.push({ id: groupId, label: L, name: `Grupo ${L}`, teamIds })
  }
  return { teams, groups }
}

// rankings completos [pos1..pos4] = orden natural tX1,tX2,tX3,tX4 del grupo
function completeRankings(participantId: string, groups: DbGroup[]) {
  return groups.map((g) => ({
    participantId, groupId: g.id,
    rankings: g.teamIds.map((teamId, i) => ({ teamId, position: i + 1 })),
  }))
}

const SCORING: ScoringParams = {
  pts_group_position_exact: 5, pts_group_position_partial: 2, bonus_group_complete: 10,
  pts_third_correct: 5, pts_ko_advances: 10, pts_ko_exact_score: 5,
  pts_dark_horse_per_round: 8, pts_disappointment_per_round: 3, mult_triple: 10,
  scale_r32: 1, scale_r16: 2, scale_qf: 3, scale_sf: 4, scale_final: 5,
}

// lockedAt = scheduledAt − 30min
const lock = (iso: string) => new Date(Date.parse(iso) - 30 * 60_000).toISOString()

function buildKoMatches(): DbKoMatch[] {
  const m = (
    id: string, roundSlug: DbKoMatch['roundSlug'], n: number, scheduledAt: string,
    status: DbKoMatch['status'], homeTeamId: string | null, awayTeamId: string | null,
    result: DbKoMatch['result'],
  ): DbKoMatch => ({
    id, roundSlug, externalMatchId: n, matchNumber: n, scheduledAt, lockedAt: lock(scheduledAt),
    status, homeTeamId, awayTeamId, homeTeamLabel: homeTeamId ? null : `Pos ${n}`, awayTeamLabel: awayTeamId ? null : `Pos ${n}b`, result,
  })
  return [
    // finished (desempate): r32-1, r32-2 y r16-1
    m('ko-r32-1', 'r32', 1, '2026-06-29T16:00:00.000Z', 'finished', 'tA1', 'tB1', { scoreHome: 2, scoreAway: 1, winnerTeamId: 'tA1' }),
    m('ko-r32-2', 'r32', 2, '2026-06-29T20:00:00.000Z', 'finished', 'tC1', 'tD1', { scoreHome: 1, scoreAway: 0, winnerTeamId: 'tC1' }),
    // locked sin resultado: lockedAt en el pasado respecto a now de test (2026-06-06) → MATCH_LOCKED sin setNow
    m('ko-r32-locked', 'r32', 3, '2026-06-05T16:00:00.000Z', 'scheduled', 'tE1', 'tF1', null),
    // abiertos (lockedAt futuro): para crear/editar predicciones en tests
    m('ko-r32-open-1', 'r32', 4, '2026-06-29T16:00:00.000Z', 'scheduled', 'tG1', 'tH1', null),
    m('ko-r32-open-2', 'r32', 5, '2026-06-30T16:00:00.000Z', 'scheduled', 'tA2', 'tB2', null),
    m('ko-r32-open-3', 'r32', 6, '2026-07-01T16:00:00.000Z', 'scheduled', 'tC2', 'tD2', null),
    m('ko-r32-open-4', 'r32', 7, '2026-07-02T16:00:00.000Z', 'scheduled', 'tE2', 'tF2', null),
    m('ko-r32-open-5', 'r32', 8, '2026-07-03T16:00:00.000Z', 'scheduled', 'tG2', 'tH2', null),
    // placeholder sin cruce definido (homeTeam null)
    m('ko-r16-1', 'r16', 1, '2026-07-05T16:00:00.000Z', 'finished', 'tA1', 'tC1', { scoreHome: 0, scoreAway: 0, winnerTeamId: 'tA1' }),
  ]
}

export function makeDb(): Db {
  const { teams, groups } = buildCatalog()
  const koMatches = buildKoMatches()

  const participants = [
    { id: 'p-admin', googleSub: 'sub-admin', name: 'Admin', email: 'admin@polla.com', phone: '+573000000000', role: 'admin' as const },
    { id: 'p-juan', googleSub: 'sub-juan', name: 'Juan', email: 'juan@gmail.com', phone: '+573001111111', role: 'participant' as const },
    { id: 'p-maria', googleSub: 'sub-maria', name: 'María', email: 'maria@gmail.com', phone: '+573002222222', role: 'participant' as const },
    { id: 'p-luis', googleSub: 'sub-luis', name: 'Luis', email: 'luis@gmail.com', phone: '+573003333333', role: 'participant' as const },
    { id: 'p-pedro', googleSub: 'sub-pedro', name: 'Pedro', email: 'pedro@gmail.com', phone: '+573004444444', role: 'participant' as const },
  ]

  // juan y maria: predicciones de grupos IDÉNTICAS (12 completas) + mismos terceros + mismos powerups
  // → groups/thirds/powerups iguales; el desempate sale solo del KO.
  const groupPredictions = [
    ...completeRankings('p-juan', groups),
    ...completeRankings('p-maria', groups),
    // luis: solo 3 grupos completos (parcial → menor total, sin 8 candidatos)
    ...completeRankings('p-luis', groups.slice(0, 3)),
  ]

  // terceros = el equipo en posición 3 de cada grupo = tX3. Selección de 8 (grupos A..H).
  const eightThirds = GROUP_LABELS.slice(0, 8).map((L) => `t${L}3`)
  const officialBestThirds = GROUP_LABELS.slice(0, 8).map((L) => `t${L}3`) // todos aciertan (demo)
  const thirdsSelections = [
    { participantId: 'p-juan', teamIds: [...eightThirds] },
    { participantId: 'p-maria', teamIds: [...eightThirds] },
  ]

  const powerups = [
    { participantId: 'p-juan', darkHorseTeamId: 'tA4', disappointmentTeamId: 'tA1' },
    { participantId: 'p-maria', darkHorseTeamId: 'tA4', disappointmentTeamId: 'tA1' },
    // luis sin powerups (POST 201 test)
  ]

  // KO desempate (escalas r32=1, r16=2; advances=10, exact=5):
  // juan: r32-1 exacto(15)+r32-2 exacto(15)+r16-1 solo avanza(20) = 50, 2 exactos
  // maria: r32-1 avanza(10)+r32-2 avanza(10)+r16-1 exacto(30) = 50, 1 exacto
  const koPredictions = [
    { participantId: 'p-juan', matchId: 'ko-r32-1', scoreHome: 2, scoreAway: 1, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-juan', matchId: 'ko-r32-2', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tC1', tripleActive: false },
    { participantId: 'p-juan', matchId: 'ko-r16-1', scoreHome: 3, scoreAway: 1, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r32-1', scoreHome: 3, scoreAway: 0, teamAdvancesId: 'tA1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r32-2', scoreHome: 2, scoreAway: 0, teamAdvancesId: 'tC1', tripleActive: false },
    { participantId: 'p-maria', matchId: 'ko-r16-1', scoreHome: 0, scoreAway: 0, teamAdvancesId: 'tA1', tripleActive: false },
    // pedro: 3 triples activos en partidos abiertos → triple agotado (no consume por estar finished)
    { participantId: 'p-pedro', matchId: 'ko-r32-open-1', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tG1', tripleActive: true },
    { participantId: 'p-pedro', matchId: 'ko-r32-open-2', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tA2', tripleActive: true },
    { participantId: 'p-pedro', matchId: 'ko-r32-open-3', scoreHome: 1, scoreAway: 0, teamAdvancesId: 'tC2', tripleActive: true },
  ]

  // standing oficial = orden natural (tX1..tX4) por grupo → juan/maria aciertan todo (demo de puntos)
  const officialGroupStandings: Record<string, string[]> = {}
  for (const g of groups) officialGroupStandings[g.id] = [...g.teamIds]

  // rondas avanzadas para powerups: darkHorse tA4 avanzó 2, disappointment tA1 avanzó 1
  const teamRoundsAdvanced: Record<string, number> = { tA4: 2, tA1: 1 }

  return {
    currentSessionId: null,
    tournamentStartAt: '2026-06-11T16:00:00.000Z',
    participants,
    invitations: [
      { id: 'inv-ok', code: 'OK1234', usedByParticipantId: null, usedAt: null, expiresAt: '2026-06-12T15:00:00.000Z', createdAt: '2026-06-06T15:00:00.000Z' },
      { id: 'inv-used', code: 'USED99', usedByParticipantId: 'p-juan', usedAt: '2026-06-06T16:00:00.000Z', expiresAt: '2026-06-12T15:00:00.000Z', createdAt: '2026-06-06T15:00:00.000Z' },
      { id: 'inv-exp', code: 'EXP000', usedByParticipantId: null, usedAt: null, expiresAt: '2026-06-05T15:00:00.000Z', createdAt: '2026-06-04T15:00:00.000Z' },
    ],
    teams, groups, groupPredictions, thirdsSelections, powerups,
    koRounds: [
      { slug: 'r32', name: 'Dieciseisavos', order: 1 }, { slug: 'r16', name: 'Octavos', order: 2 },
      { slug: 'qf', name: 'Cuartos', order: 3 }, { slug: 'sf', name: 'Semifinal', order: 4 },
      { slug: '3rd', name: 'Tercer puesto', order: 5 }, { slug: 'final', name: 'Final', order: 6 },
    ],
    koMatches, koPredictions, scoringParams: SCORING,
    officialGroupStandings, officialBestThirds, teamRoundsAdvanced,
  }
}

export function resetDb(): void { setDb(makeDb()) }

setDb(makeDb())
```

- [ ] **Step 3: Verificar typecheck y suite existente (auth sigue verde)**

Run: `npx tsc -b && npx vitest run`
Expected: typecheck OK; los 34 tests de auth/lib siguen PASS (el seed extendido no rompe nada).

- [ ] **Step 4: Commit**

```bash
git add src/mocks/db.ts src/mocks/seed.ts
git commit -m "feat: estado y seed del mock para dominio participante (grupos/ko/powerups + estado oficial)"
```

---

## Task 3: Módulo compartido de handlers (`_shared.ts`) y refactor de `auth.ts`

**Files:**
- Create: `src/mocks/handlers/_shared.ts`
- Modify: `src/mocks/handlers/auth.ts`

- [ ] **Step 1: Crear `src/mocks/handlers/_shared.ts`**

```ts
import { HttpResponse } from 'msw'
import { db, type DbParticipant } from '../db'
import type { ErrorCode } from '../../types/enums'
import { now } from '../../lib/clock'

export const err = (code: ErrorCode, error: string, status: number) => HttpResponse.json({ error, code }, { status })

type SessionResult = { participant: DbParticipant; response?: undefined } | { participant?: undefined; response: HttpResponse }

/** Resuelve el participante de la sesión activa (§9.5) o un 401 listo para retornar. */
export function requireSession(): SessionResult {
  if (!db.currentSessionId) return { response: err('UNAUTHORIZED', 'No autorizado', 401) }
  const participant = db.participants.find((p) => p.id === db.currentSessionId)
  if (!participant) return { response: err('UNAUTHORIZED', 'No autorizado', 401) }
  return { participant }
}

/** Candado global de grupos/terceros/powerups: cerrado cuando now() >= tournamentStartAt. */
export function groupsLocked(): boolean {
  return now() >= Date.parse(db.tournamentStartAt)
}
```

- [ ] **Step 2: Refactorizar `src/mocks/handlers/auth.ts` para usar `_shared.err`**

Reemplazar las dos primeras líneas de helpers de `auth.ts`:

```ts
// QUITAR:
const E164 = /^\+[1-9]\d{7,14}$/
const err = (code: string, error: string, status: number) => HttpResponse.json({ error, code }, { status })
```

por:

```ts
import { err } from './_shared'
const E164 = /^\+[1-9]\d{7,14}$/
```

(El `import { http, HttpResponse } from 'msw'` se mantiene; `HttpResponse` sigue usándose para `HttpResponse.json(toMe(...))` y el 204 de logout.)

- [ ] **Step 3: Verificar que auth sigue verde**

Run: `npx vitest run src/mocks/handlers/auth.test.ts`
Expected: PASS (10 tests) — mismo `{error, code}` + status.

- [ ] **Step 4: Commit**

```bash
git add src/mocks/handlers/_shared.ts src/mocks/handlers/auth.ts
git commit -m "refactor: helper compartido err/requireSession/groupsLocked y auth lo reutiliza"
```

---

## Task 4: Motor de scoring (`scoring.ts`) — TDD

**Files:**
- Create: `src/mocks/scoring.ts`
- Test: `src/mocks/scoring.test.ts`

- [ ] **Step 1: Escribir el test que falla (`src/mocks/scoring.test.ts`)**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { resetDb } from './seed'
import { computeScoreboard, computeBreakdown, countKoExact, koPointsFor } from './scoring'

beforeEach(() => resetDb())

describe('computeScoreboard', () => {
  it('ordena por total desc y asigna premios 700k/250k/50k, null del 4º en adelante', () => {
    const sb = computeScoreboard(db)
    expect(sb.map((e) => e.total)).toEqual([...sb.map((e) => e.total)].sort((a, b) => b - a))
    expect(sb[0].rank).toBe(1)
    expect([sb[0].prize, sb[1].prize, sb[2].prize]).toEqual([700_000, 250_000, 50_000])
    if (sb.length > 3) expect(sb[3].prize).toBeNull()
  })

  it('excluye al admin (D5)', () => {
    expect(computeScoreboard(db).some((e) => e.participant.id === 'p-admin')).toBe(false)
  })

  it('rompe empate de total por mayor # de exactos KO (RF-40)', () => {
    expect(computeBreakdown(db, 'p-juan').total).toBe(computeBreakdown(db, 'p-maria').total)
    expect(countKoExact(db, 'p-juan')).toBeGreaterThan(countKoExact(db, 'p-maria'))
    const sb = computeScoreboard(db)
    const iJuan = sb.findIndex((e) => e.participant.id === 'p-juan')
    const iMaria = sb.findIndex((e) => e.participant.id === 'p-maria')
    expect(iJuan).toBeLessThan(iMaria)
  })
})

describe('coherencia scoreboard ↔ breakdown', () => {
  it('mismo total en ambas vistas', () => {
    for (const e of computeScoreboard(db)) expect(computeBreakdown(db, e.participant.id).total).toBe(e.total)
  })
  it('breakdown suma sus 5 dominios; disappointment ≤ 0, darkHorse ≥ 0', () => {
    const { breakdown, total } = computeBreakdown(db, 'p-juan')
    const { groups, thirds, ko, darkHorse, disappointment } = breakdown
    expect(disappointment).toBeLessThanOrEqual(0)
    expect(darkHorse).toBeGreaterThanOrEqual(0)
    expect(total).toBe(groups + thirds + ko + darkHorse + disappointment)
  })
})

describe('koPointsFor — null vs no-null', () => {
  it('no-null y escalado por ronda en partido finished con marcador exacto (r32)', () => {
    const pe = koPointsFor(db, 'p-juan', 'ko-r32-1')!
    expect(pe.scale_slug).toBe('scale_r32')
    expect(pe.pts_ko_advances).toBe(db.scoringParams.pts_ko_advances)
    expect(pe.pts_ko_exact_score).toBe(db.scoringParams.pts_ko_exact_score)
    expect(pe.total).toBe(pe.pts_ko_advances + pe.pts_ko_exact_score + pe.mult_triple)
  })
  it('null si el participante no predijo ese partido', () => {
    expect(koPointsFor(db, 'p-luis', 'ko-r32-1')).toBeNull()
  })
})

describe('tripleUsesRemaining (derivado, clamp 0..3)', () => {
  it('pedro tiene 3 triples activos → remaining 0', () => {
    expect(computeBreakdown(db, 'p-pedro').tripleUsesRemaining).toBe(0)
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/mocks/scoring.test.ts`
Expected: FAIL — `scoring` no exporta `computeScoreboard`.

- [ ] **Step 3: Implementar `src/mocks/scoring.ts`**

```ts
import type { Db, DbKoMatch, DbKoPrediction, DbGroupRanking } from './db'
import { ROUND_TO_SCALE, type ScoringParams } from '../types/enums'
import type {
  GroupPointsEarned, ThirdPointsEarned, KoPointsEarned, PowerupsPointsEarned,
  ScoreBreakdown, ScoreBreakdownDetail, ScoreboardEntry,
} from '../types/api'

const PRIZES = [700_000, 250_000, 50_000] as const
const TRIPLE_CAP = 3
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

// ── Funciones puras (core) ────────────────────────────────────────────────────
export function computeGroupPoints(
  rankings: DbGroupRanking[], official: string[] | undefined, params: ScoringParams,
): GroupPointsEarned | null {
  if (!official) return null
  const officialPos = new Map(official.map((teamId, i) => [teamId, i + 1]))
  let exact = 0, partial = 0
  for (const r of rankings) {
    const realPos = officialPos.get(r.teamId)
    if (realPos == null) continue
    if (realPos === r.position) exact += 1
    else partial += 1
  }
  const allFour = rankings.length === 4 && exact === 4
  const pts_group_position_exact = exact * params.pts_group_position_exact
  const pts_group_position_partial = partial * params.pts_group_position_partial
  const bonus_group_complete = allFour ? params.bonus_group_complete : 0
  return {
    pts_group_position_exact, pts_group_position_partial, bonus_group_complete,
    total: pts_group_position_exact + pts_group_position_partial + bonus_group_complete,
  }
}

export function computeThirdPoints(
  teamId: string, officialBestThirds: string[] | null, params: ScoringParams,
): ThirdPointsEarned | null {
  if (!officialBestThirds) return null
  const pts_third_correct = officialBestThirds.includes(teamId) ? params.pts_third_correct : 0
  return { pts_third_correct, total: pts_third_correct }
}

export function computeKoPoints(
  match: DbKoMatch, pred: DbKoPrediction, params: ScoringParams,
): KoPointsEarned | null {
  if (!match.result) return null
  const scale_slug = ROUND_TO_SCALE[match.roundSlug]
  const scale_factor = params[scale_slug]
  const advancesHit = pred.teamAdvancesId === match.result.winnerTeamId
  const exactHit = pred.scoreHome === match.result.scoreHome && pred.scoreAway === match.result.scoreAway
  const pts_ko_advances = (advancesHit ? params.pts_ko_advances : 0) * scale_factor
  const pts_ko_exact_score = (exactHit ? params.pts_ko_exact_score : 0) * scale_factor
  const mult_triple = (pred.tripleActive && advancesHit ? params.mult_triple : 0) * scale_factor
  return {
    pts_ko_advances, pts_ko_exact_score, mult_triple, scale_factor, scale_slug,
    total: pts_ko_advances + pts_ko_exact_score + mult_triple,
  }
}

export function computePowerupsPoints(
  darkHorseTeamId: string | null, disappointmentTeamId: string | null,
  teamRoundsAdvanced: Record<string, number> | null, params: ScoringParams,
): PowerupsPointsEarned | null {
  if (!teamRoundsAdvanced) return null
  const dhRounds = darkHorseTeamId ? (teamRoundsAdvanced[darkHorseTeamId] ?? 0) : 0
  const dRounds = disappointmentTeamId ? (teamRoundsAdvanced[disappointmentTeamId] ?? 0) : 0
  const pts_dark_horse_per_round = dhRounds * params.pts_dark_horse_per_round // ≥ 0
  const pts_disappointment_per_round = -(dRounds * params.pts_disappointment_per_round) // ≤ 0
  return {
    pts_dark_horse_per_round, pts_disappointment_per_round,
    dark_horse_rounds_advanced: dhRounds, disappointment_rounds_advanced: dRounds,
    total: pts_dark_horse_per_round + pts_disappointment_per_round,
  }
}

// ── Wrappers db-aware (los que invocan los handlers) ──────────────────────────
export function groupPointsFor(db: Db, participantId: string, groupId: string): GroupPointsEarned | null {
  const gp = db.groupPredictions.find((g) => g.participantId === participantId && g.groupId === groupId)
  if (!gp) return null
  return computeGroupPoints(gp.rankings, db.officialGroupStandings?.[groupId], db.scoringParams)
}
export function thirdPointsFor(db: Db, _participantId: string, teamId: string): ThirdPointsEarned | null {
  return computeThirdPoints(teamId, db.officialBestThirds, db.scoringParams)
}
export function koPointsFor(db: Db, participantId: string, matchId: string): KoPointsEarned | null {
  const pred = db.koPredictions.find((p) => p.participantId === participantId && p.matchId === matchId)
  const match = db.koMatches.find((m) => m.id === matchId)
  if (!pred || !match) return null
  return computeKoPoints(match, pred, db.scoringParams)
}
export function powerupsPointsFor(db: Db, participantId: string): PowerupsPointsEarned | null {
  const pw = db.powerups.find((x) => x.participantId === participantId)
  return computePowerupsPoints(pw?.darkHorseTeamId ?? null, pw?.disappointmentTeamId ?? null, db.teamRoundsAdvanced, db.scoringParams)
}

// ── Derivados de participante ─────────────────────────────────────────────────
export function tripleUsesRemaining(db: Db, participantId: string): number {
  const used = db.koPredictions.filter((p) => p.participantId === participantId && p.tripleActive).length
  return clamp(TRIPLE_CAP - used, 0, TRIPLE_CAP)
}

export function countKoExact(db: Db, participantId: string): number {
  let n = 0
  for (const pred of db.koPredictions) {
    if (pred.participantId !== participantId) continue
    const match = db.koMatches.find((m) => m.id === pred.matchId)
    if (match?.result && pred.scoreHome === match.result.scoreHome && pred.scoreAway === match.result.scoreAway) n += 1
  }
  return n
}

export function computeBreakdown(db: Db, participantId: string): ScoreBreakdown {
  const p = db.participants.find((x) => x.id === participantId)
  if (!p) throw new Error(`PARTICIPANT_NOT_FOUND:${participantId}`)

  let groups = 0
  for (const gp of db.groupPredictions.filter((g) => g.participantId === participantId)) {
    const pe = computeGroupPoints(gp.rankings, db.officialGroupStandings?.[gp.groupId], db.scoringParams)
    if (pe) groups += pe.total
  }
  let thirds = 0
  const sel = db.thirdsSelections.find((s) => s.participantId === participantId)
  for (const teamId of sel?.teamIds ?? []) {
    const pe = computeThirdPoints(teamId, db.officialBestThirds, db.scoringParams)
    if (pe) thirds += pe.total
  }
  let ko = 0
  for (const pred of db.koPredictions.filter((k) => k.participantId === participantId)) {
    const match = db.koMatches.find((m) => m.id === pred.matchId)
    if (!match) continue
    const pe = computeKoPoints(match, pred, db.scoringParams)
    if (pe) ko += pe.total
  }
  const pw = powerupsPointsFor(db, participantId)
  const darkHorse = pw?.pts_dark_horse_per_round ?? 0
  const disappointment = pw?.pts_disappointment_per_round ?? 0

  const breakdown: ScoreBreakdownDetail = { groups, thirds, ko, darkHorse, disappointment }
  return {
    participant: { id: p.id, name: p.name },
    total: groups + thirds + ko + darkHorse + disappointment,
    breakdown,
    tripleUsesRemaining: tripleUsesRemaining(db, participantId),
    prize: null, // lo fija el handler con prizeForParticipant
  }
}

export function computeScoreboard(db: Db): ScoreboardEntry[] {
  const rows = db.participants
    .filter((p) => p.role !== 'admin')
    .map((p) => ({ id: p.id, name: p.name, total: computeBreakdown(db, p.id).total, koExact: countKoExact(db, p.id) }))
  rows.sort((a, b) => (b.total - a.total) || (b.koExact - a.koExact) || a.id.localeCompare(b.id))
  return rows.map((r, i) => ({
    rank: i + 1, participant: { id: r.id, name: r.name }, total: r.total, prize: i < PRIZES.length ? PRIZES[i] : null,
  }))
}

export function prizeForParticipant(db: Db, participantId: string): number | null {
  return computeScoreboard(db).find((e) => e.participant.id === participantId)?.prize ?? null
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/mocks/scoring.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mocks/scoring.ts src/mocks/scoring.test.ts
git commit -m "feat: motor de scoring puro (pointsEarned/breakdown/scoreboard/triple) con tests"
```

---

# FASE 2 — Grupos (handler + cascada terceros)

## Task 5: Handlers de grupos y terceros (`groups.ts`) — TDD

**Files:**
- Create: `src/mocks/handlers/groups.ts`
- Test: `src/mocks/handlers/groups.test.ts`
- Modify: `src/mocks/handlers/index.ts`

- [ ] **Step 1: Escribir el test que falla (`src/mocks/handlers/groups.test.ts`)**

> El helper `post`/`get` antepone `/api`. `setup.ts` ya hace login-less reset + `setNow('2026-06-06T12:00:00Z')` (grupos abiertos) en `beforeEach`. Login como juan en `beforeEach` local.

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setNow } from '../../lib/clock'
import { db } from '../db'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const login = () => post('/auth/login', { credential: makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }) })
const rankingsFor = (order: string[]) => order.map((teamId, i) => ({ teamId, position: i + 1 }))

beforeEach(async () => { await login() })

describe('GET /groups', () => {
  it('devuelve los 12 grupos con 4 equipos', async () => {
    const { data } = await (await get('/groups')).json()
    expect(data).toHaveLength(12)
    expect(data[0].teams).toHaveLength(4)
  })
})

describe('candado de grupos — borde exacto (§9.4)', () => {
  it('now == tournamentStartAt → 423 PREDICTIONS_LOCKED', async () => {
    setNow(db.tournamentStartAt)
    const g = db.groups[0]
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: rankingsFor(g.teamIds) }] })
    expect(res.status).toBe(423)
    expect(await res.json()).toMatchObject({ code: 'PREDICTIONS_LOCKED' })
  })
  it('1ms antes → guarda (200)', async () => {
    setNow(new Date(Date.parse(db.tournamentStartAt) - 1).toISOString())
    const g = db.groups[0]
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: rankingsFor(g.teamIds) }] })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, savedGroups: 1 })
  })
})

describe('validación de rankings', () => {
  it('400 INVALID_RANKINGS con posición duplicada', async () => {
    const g = db.groups[0]
    const bad = [
      { teamId: g.teamIds[0], position: 1 }, { teamId: g.teamIds[1], position: 1 },
      { teamId: g.teamIds[2], position: 3 }, { teamId: g.teamIds[3], position: 4 },
    ]
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: bad }] })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_RANKINGS' })
  })
  it('400 INVALID_RANKINGS con teamId ajeno al grupo', async () => {
    const g = db.groups[0]
    const foreign = db.groups[1].teamIds[0]
    const bad = rankingsFor([foreign, g.teamIds[1], g.teamIds[2], g.teamIds[3]])
    const res = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: bad }] })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_RANKINGS' })
  })
})

describe('GET /groups/predictions/me', () => {
  it('juan tiene 12 grupos completos', async () => {
    const body = await (await get('/groups/predictions/me')).json()
    expect(body.completedGroups).toBe(12)
    expect(body.data).toHaveLength(12)
    expect(body.data[0].groupComplete).toBe(true)
  })
})

describe('cascada terceros: re-upsert que cambia el 3° lo des-selecciona', () => {
  it('editar grupo cambia el 3° → ese tercero deja de ser candidato y baja selectedCount', async () => {
    const before = await (await get('/groups/thirds')).json()
    expect(before.selectedCount).toBe(8) // seed: 8 seleccionados
    const target = before.data.find((c: { selected: boolean }) => c.selected)
    const g = db.groups.find((x) => x.id === target.groupId)!
    const oldThird = target.teamId
    const newThird = g.teamIds.find((id) => id !== oldThird)!
    const others = g.teamIds.filter((id) => id !== newThird)
    // newThird → posición 3
    const ordered = [others[0], others[1], newThird, others[2]]
    const up = await post('/groups/predictions', { predictions: [{ groupId: g.id, rankings: rankingsFor(ordered) }] })
    expect(up.status).toBe(200)
    const after = await (await get('/groups/thirds')).json()
    expect(after.data.find((c: { teamId: string }) => c.teamId === oldThird)).toBeUndefined()
    expect(after.selectedCount).toBe(7)
  })
})

describe('POST /groups/thirds', () => {
  it('200 con 8 candidatos válidos', async () => {
    const { data } = await (await get('/groups/thirds')).json()
    const eight = data.slice(0, 8).map((c: { teamId: string }) => c.teamId)
    const res = await post('/groups/thirds', { teamIds: eight })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, selectedCount: 8 })
  })
  it('400 INVALID_THIRDS_COUNT si no son 8', async () => {
    const { data } = await (await get('/groups/thirds')).json()
    const res = await post('/groups/thirds', { teamIds: data.slice(0, 7).map((c: { teamId: string }) => c.teamId) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_THIRDS_COUNT' })
  })
  it('400 INVALID_THIRD_CANDIDATE con teamId no candidato', async () => {
    const res = await post('/groups/thirds', { teamIds: Array.from({ length: 8 }, (_, i) => `nope-${i}`) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_THIRD_CANDIDATE' })
  })
})

describe('GET /groups/predictions/friends — gating', () => {
  it('antes del torneo → available:false + availableAt', async () => {
    const body = await (await get('/groups/predictions/friends')).json()
    expect(body.available).toBe(false)
    expect(body.availableAt).toBe(db.tournamentStartAt)
  })
  it('iniciado el torneo → available:true, excluye admin y al actual', async () => {
    setNow(db.tournamentStartAt)
    const body = await (await get('/groups/predictions/friends')).json()
    expect(body.available).toBe(true)
    const ids = body.data.map((d: { participant: { id: string } }) => d.participant.id)
    expect(ids).not.toContain('p-juan')
    expect(ids).not.toContain('p-admin')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/mocks/handlers/groups.test.ts`
Expected: FAIL — request sin handler (`onUnhandledRequest:'error'`).

- [ ] **Step 3: Implementar `src/mocks/handlers/groups.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { db, type DbGroup, type DbGroupPrediction } from '../db'
import { now } from '../../lib/clock'
import { err, requireSession, groupsLocked } from './_shared'
import { groupPointsFor, thirdPointsFor } from '../scoring'

const predOf = (pid: string, gid: string) => db.groupPredictions.find((p) => p.participantId === pid && p.groupId === gid)
const isComplete = (p?: DbGroupPrediction) => !!p && p.rankings.length === 4
const teamById = (id: string) => db.teams.find((t) => t.id === id)

function thirdTeamId(pred?: DbGroupPrediction): string | null {
  if (!pred || pred.rankings.length !== 4) return null
  return pred.rankings.find((r) => r.position === 3)?.teamId ?? null
}
function validThirdCandidates(pid: string): Set<string> {
  const set = new Set<string>()
  for (const g of db.groups) { const t = thirdTeamId(predOf(pid, g.id)); if (t) set.add(t) }
  return set
}
function validateRankings(group: DbGroup, rankings: { teamId: string; position: number }[]): boolean {
  if (rankings.length !== 4) return false
  const positions = new Set<number>(), teamIds = new Set<string>()
  for (const r of rankings) {
    if (r.position < 1 || r.position > 4) return false
    if (positions.has(r.position) || teamIds.has(r.teamId)) return false
    if (!group.teamIds.includes(r.teamId)) return false
    positions.add(r.position); teamIds.add(r.teamId)
  }
  return positions.size === 4 && teamIds.size === 4
}
function serializeRankings(pred?: DbGroupPrediction) {
  return (pred?.rankings ?? []).slice().sort((a, b) => a.position - b.position).map((r) => {
    const t = teamById(r.teamId)!
    return { teamId: t.id, name: t.name, code: t.code, isTop8: t.isTop8, position: r.position }
  })
}

export const groupsHandlers = [
  http.get('/api/groups', () => {
    const s = requireSession(); if (s.response) return s.response
    const data = db.groups.map((g) => ({
      id: g.id, label: g.label, name: g.name,
      teams: g.teamIds.map((id) => { const t = teamById(id)!; return { id: t.id, name: t.name, code: t.code, isTop8: t.isTop8 } }),
    }))
    return HttpResponse.json({ data }, { status: 200 })
  }),

  http.post('/api/groups/predictions', async ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    if (groupsLocked()) return err('PREDICTIONS_LOCKED', 'Las predicciones de grupos están cerradas', 423)
    const body = (await request.json()) as { predictions: { groupId: string; rankings: { teamId: string; position: number }[] }[] }
    if (!body?.predictions?.length) return err('INVALID_RANKINGS', 'Predicciones vacías', 400)
    for (const p of body.predictions) {
      const group = db.groups.find((g) => g.id === p.groupId)
      if (!group) return err('INVALID_RANKINGS', `Grupo ${p.groupId} no existe`, 400)
      if (!validateRankings(group, p.rankings)) return err('INVALID_RANKINGS', `Rankings inválidos en grupo ${group.label}`, 400)
    }
    const pid = s.participant.id
    for (const p of body.predictions) {
      const existing = predOf(pid, p.groupId)
      const rankings = p.rankings.map((r) => ({ teamId: r.teamId, position: r.position }))
      if (existing) existing.rankings = rankings
      else db.groupPredictions.push({ participantId: pid, groupId: p.groupId, rankings })
    }
    // CASCADA: purgar terceros que dejaron de ser posición-3
    const candidates = validThirdCandidates(pid)
    const sel = db.thirdsSelections.find((x) => x.participantId === pid)
    if (sel) sel.teamIds = sel.teamIds.filter((id) => candidates.has(id))
    return HttpResponse.json({ ok: true, savedGroups: body.predictions.length }, { status: 200 })
  }),

  http.get('/api/groups/predictions/me', () => {
    const s = requireSession(); if (s.response) return s.response
    const pid = s.participant.id
    const data = db.groups.map((g) => {
      const pred = predOf(pid, g.id), complete = isComplete(pred)
      return {
        groupId: g.id, label: g.label, name: g.name, groupComplete: complete,
        rankings: serializeRankings(pred), pointsEarned: complete ? groupPointsFor(db, pid, g.id) : null,
      }
    })
    return HttpResponse.json({ data, completedGroups: data.filter((d) => d.groupComplete).length }, { status: 200 })
  }),

  http.get('/api/groups/thirds', () => {
    const s = requireSession(); if (s.response) return s.response
    const pid = s.participant.id
    const sel = db.thirdsSelections.find((x) => x.participantId === pid)
    const candidates = validThirdCandidates(pid)
    const selectedSet = new Set((sel?.teamIds ?? []).filter((id) => candidates.has(id)))
    const data = db.groups.map((g) => {
      const tId = thirdTeamId(predOf(pid, g.id)); if (!tId) return null
      const t = teamById(tId)!
      return { teamId: t.id, name: t.name, code: t.code, groupId: g.id, label: g.label, selected: selectedSet.has(t.id), pointsEarned: thirdPointsFor(db, pid, t.id) }
    }).filter((x): x is NonNullable<typeof x> => x !== null)
    return HttpResponse.json({ data, selectedCount: selectedSet.size }, { status: 200 })
  }),

  http.post('/api/groups/thirds', async ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    if (groupsLocked()) return err('PREDICTIONS_LOCKED', 'Las predicciones de grupos están cerradas', 423)
    const body = (await request.json()) as { teamIds: string[] }
    const teamIds = body?.teamIds ?? []
    if (teamIds.length !== 8) return err('INVALID_THIRDS_COUNT', 'Debes seleccionar exactamente 8 equipos', 400)
    const pid = s.participant.id
    const candidates = validThirdCandidates(pid)
    const seen = new Set<string>()
    for (const id of teamIds) {
      if (seen.has(id) || !candidates.has(id)) return err('INVALID_THIRD_CANDIDATE', `El equipo ${id} no es un tercero válido en tus predicciones`, 400)
      seen.add(id)
    }
    const existing = db.thirdsSelections.find((x) => x.participantId === pid)
    if (existing) existing.teamIds = [...teamIds]
    else db.thirdsSelections.push({ participantId: pid, teamIds: [...teamIds] })
    return HttpResponse.json({ ok: true, selectedCount: 8 }, { status: 200 })
  }),

  http.get('/api/groups/predictions/friends', () => {
    const s = requireSession(); if (s.response) return s.response
    if (now() < Date.parse(db.tournamentStartAt)) return HttpResponse.json({ available: false, availableAt: db.tournamentStartAt }, { status: 200 })
    const meId = s.participant.id
    const data = db.participants.filter((p) => p.id !== meId && p.role !== 'admin').map((p) => ({
      participant: { id: p.id, name: p.name },
      predictions: db.groups.map((g) => {
        const pred = predOf(p.id, g.id)
        return { groupId: g.id, label: g.label, name: g.name, groupComplete: isComplete(pred), rankings: serializeRankings(pred), pointsEarned: null }
      }),
    }))
    return HttpResponse.json({ available: true, data }, { status: 200 })
  }),
]
```

- [ ] **Step 4: Registrar en `src/mocks/handlers/index.ts`**

```ts
import { authHandlers } from './auth'
import { groupsHandlers } from './groups'

export const handlers = [...authHandlers, ...groupsHandlers]
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run src/mocks/handlers/groups.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/handlers/groups.ts src/mocks/handlers/groups.test.ts src/mocks/handlers/index.ts
git commit -m "feat: handlers de grupos y terceros (candado, validacion, cascada, gating amigos) con tests"
```

---

## Task 6: Capa de datos de grupos (`features/groups/api.ts`, `hooks.ts`)

**Files:**
- Create: `src/features/groups/api.ts`, `src/features/groups/hooks.ts`

- [ ] **Step 1: Implementar `src/features/groups/api.ts`**

```ts
import { request } from '../../lib/apiClient'
import type {
  Group, MyGroupPredictions, SaveGroupPredictionsBody, ThirdsResponse, SaveThirdsBody, FriendsGroups,
} from '../../types/api'

export const getGroups = () => request<{ data: Group[] }>('GET', '/groups')
export const getMyGroupPredictions = () => request<MyGroupPredictions>('GET', '/groups/predictions/me')
export const saveGroupPredictions = (body: SaveGroupPredictionsBody) =>
  request<{ ok: boolean; savedGroups: number }>('POST', '/groups/predictions', { body })
export const getThirds = () => request<ThirdsResponse>('GET', '/groups/thirds')
export const saveThirds = (body: SaveThirdsBody) => request<{ ok: boolean; selectedCount: number }>('POST', '/groups/thirds', { body })
export const getFriendsGroups = () => request<FriendsGroups>('GET', '/groups/predictions/friends')
```

- [ ] **Step 2: Implementar `src/features/groups/hooks.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { useAuth } from '../../auth/useAuth'
import { getGroups, getMyGroupPredictions, saveGroupPredictions, getThirds, saveThirds, getFriendsGroups } from './api'

export function useGroups() {
  return useQuery({ queryKey: keys.groups.all(), queryFn: getGroups })
}
export function useMyGroupPredictions() {
  const { participant } = useAuth()
  return useQuery({ queryKey: keys.groups.predictionsMe(participant?.id ?? 'anon'), queryFn: getMyGroupPredictions, enabled: !!participant })
}
export function useSaveGroupPredictions() {
  const qc = useQueryClient(); const { participant } = useAuth()
  return useMutation({
    mutationFn: saveGroupPredictions,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.groups.predictionsMe(participant?.id ?? 'anon') })
      qc.invalidateQueries({ queryKey: keys.groups.thirds(participant?.id ?? 'anon') }) // cascada
    },
  })
}
export function useThirds() {
  const { participant } = useAuth()
  return useQuery({ queryKey: keys.groups.thirds(participant?.id ?? 'anon'), queryFn: getThirds, enabled: !!participant })
}
export function useSaveThirds() {
  const qc = useQueryClient(); const { participant } = useAuth()
  return useMutation({ mutationFn: saveThirds, onSuccess: () => qc.invalidateQueries({ queryKey: keys.groups.thirds(participant?.id ?? 'anon') }) })
}
export function useFriendsGroups() {
  return useQuery({ queryKey: keys.groups.friends(), queryFn: getFriendsGroups })
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/features/groups/api.ts src/features/groups/hooks.ts
git commit -m "feat: api y hooks de grupos/terceros (TanStack Query + invalidacion de cascada)"
```

---

## Task 7: Pantallas de grupos y terceros (bare) + rutas

**Files:**
- Create: `src/features/groups/GroupsList.tsx`, `src/features/groups/GroupEditor.tsx`, `src/features/groups/Thirds.tsx`
- Modify: `src/app/router.tsx`

- [ ] **Step 1: Implementar `src/features/groups/GroupsList.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useGroups, useMyGroupPredictions } from './hooks'

export function GroupsList() {
  const groups = useGroups()
  const mine = useMyGroupPredictions()
  if (groups.isLoading || mine.isLoading) return <p>Cargando…</p>
  if (groups.error) return <p role="alert">Error al cargar grupos</p>
  const completeById = new Map((mine.data?.data ?? []).map((g) => [g.groupId, g.groupComplete]))
  return (
    <div>
      <h1>Grupos ({mine.data?.completedGroups ?? 0}/12 completos)</h1>
      <ul>
        {groups.data?.data.map((g) => (
          <li key={g.id}>
            <Link to={`/predicciones/grupos/${g.id}`}>{g.name}</Link> {completeById.get(g.id) ? '✓' : '—'}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Implementar `src/features/groups/GroupEditor.tsx`**

```tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGroups, useMyGroupPredictions, useSaveGroupPredictions } from './hooks'
import { isApiError } from '../../lib/errors'

export function GroupEditor() {
  const { groupId = '' } = useParams()
  const groups = useGroups()
  const mine = useMyGroupPredictions()
  const save = useSaveGroupPredictions()
  const [message, setMessage] = useState('')
  const group = groups.data?.data.find((g) => g.id === groupId)
  const existing = mine.data?.data.find((g) => g.groupId === groupId)
  const [order, setOrder] = useState<string[]>(existing?.rankings.map((r) => r.teamId) ?? group?.teams.map((t) => t.id) ?? [])

  if (groups.isLoading || mine.isLoading) return <p>Cargando…</p>
  if (!group) return <p role="alert">Grupo no encontrado</p>

  function move(teamId: string, dir: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(teamId), j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next
    })
  }
  function onSave() {
    setMessage('')
    save.mutate(
      { predictions: [{ groupId, rankings: order.map((teamId, i) => ({ teamId, position: i + 1 })) }] },
      { onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error') },
    )
  }
  return (
    <div>
      <h1>{group.name}</h1>
      <ol>
        {order.map((teamId, i) => {
          const t = group.teams.find((x) => x.id === teamId)!
          return (
            <li key={teamId}>
              {i + 1}. {t.name} ({t.code}){t.isTop8 ? ' ★' : ''}
              <button onClick={() => move(teamId, -1)}>↑</button>
              <button onClick={() => move(teamId, 1)}>↓</button>
            </li>
          )
        })}
      </ol>
      <button onClick={onSave} disabled={save.isPending}>Guardar</button>
      {message && <p role="alert">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Implementar `src/features/groups/Thirds.tsx`**

```tsx
import { useState } from 'react'
import { useThirds, useSaveThirds } from './hooks'
import { isApiError } from '../../lib/errors'

export function Thirds() {
  const thirds = useThirds()
  const save = useSaveThirds()
  const [picked, setPicked] = useState<string[]>([])
  const [message, setMessage] = useState('')
  if (thirds.isLoading) return <p>Cargando…</p>
  const data = thirds.data?.data ?? []
  const selected = picked.length ? picked : data.filter((c) => c.selected).map((c) => c.teamId)

  function toggle(teamId: string) {
    setPicked((prev) => {
      const base = prev.length ? prev : data.filter((c) => c.selected).map((c) => c.teamId)
      return base.includes(teamId) ? base.filter((x) => x !== teamId) : [...base, teamId]
    })
  }
  function onSave() {
    setMessage('')
    save.mutate({ teamIds: selected }, { onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error') })
  }
  return (
    <div>
      <h1>Mejores terceros ({selected.length}/8)</h1>
      {data.length < 8 && <p>Completa los 12 grupos para tener candidatos suficientes.</p>}
      <ul>
        {data.map((c) => (
          <li key={c.teamId}>
            <label>
              <input type="checkbox" checked={selected.includes(c.teamId)} onChange={() => toggle(c.teamId)} />
              {c.name} ({c.code}) — Grupo {c.label}
            </label>
          </li>
        ))}
      </ul>
      <button onClick={onSave} disabled={save.isPending}>Guardar 8 terceros</button>
      {message && <p role="alert">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Añadir rutas en `src/app/router.tsx`**

Importar y montar dentro del árbol protegido. Reestructurar el nodo `/` a rutas hijas con `AppShell` + `<Outlet/>`. Reemplazar el array de `createBrowserRouter` por:

```tsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { RequireAuth } from './guards/RequireAuth'
import { AppShell } from './AppShell'
import { Login } from '../features/onboarding/Login'
import { Dashboard } from '../features/home/Dashboard'
import { Hub } from '../features/predicciones/Hub'
import { Review } from '../features/predicciones/Review'
import { GroupsList } from '../features/groups/GroupsList'
import { GroupEditor } from '../features/groups/GroupEditor'
import { Thirds } from '../features/groups/Thirds'
import { PowerupsForm } from '../features/powerups/PowerupsForm'
import { KoRoundList } from '../features/ko/KoRoundList'
import { KoRoundDetail } from '../features/ko/KoRoundDetail'
import { KoMatchDetail } from '../features/ko/KoMatchDetail'
import { Scoreboard } from '../features/scoreboard/Scoreboard'
import { Breakdown } from '../features/scoreboard/Breakdown'

function ProtectedShell() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  )
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'predicciones', element: <Hub /> },
      { path: 'predicciones/grupos', element: <GroupsList /> },
      { path: 'predicciones/grupos/:groupId', element: <GroupEditor /> },
      { path: 'predicciones/terceros', element: <Thirds /> },
      { path: 'predicciones/powerups', element: <PowerupsForm /> },
      { path: 'predicciones/revisar', element: <Review /> },
      { path: 'eliminatorias', element: <KoRoundList /> },
      { path: 'eliminatorias/:round', element: <KoRoundDetail /> },
      { path: 'eliminatorias/partido/:matchId', element: <KoMatchDetail /> },
      { path: 'tabla', element: <Scoreboard /> },
      { path: 'tabla/:participantId', element: <Breakdown /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
```

> Nota: este router importa pantallas que se crean en Tasks 9/12/14/15. Para que compile al ejecutar este task antes que aquellas, crear stubs mínimos `export function X() { return <div/> }` en cada archivo faltante y reemplazarlos en su task. Si se ejecuta el plan en orden, Tasks 9/12/14/15 ya las habrán creado.

- [ ] **Step 5: Verificar typecheck (tras stubs o pantallas reales)**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/features/groups/GroupsList.tsx src/features/groups/GroupEditor.tsx src/features/groups/Thirds.tsx src/app/router.tsx
git commit -m "feat: pantallas bare de grupos/terceros y rutas anidadas del flujo participante"
```

---

# FASE 4 — Powerups

## Task 8: Handler de powerups (`powerups.ts`) — TDD

**Files:**
- Create: `src/mocks/handlers/powerups.ts`
- Test: `src/mocks/handlers/powerups.test.ts`
- Modify: `src/mocks/handlers/index.ts`

- [ ] **Step 1: Escribir el test que falla (`src/mocks/handlers/powerups.test.ts`)**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setNow } from '../../lib/clock'
import { db } from '../db'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const send = (p: string, method: 'POST' | 'PUT', body: unknown) =>
  fetch(URL(p), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const loginAs = (sub: string, name: string) => send('/auth/login', 'POST', { credential: makeFakeIdToken({ sub, email: `${name}@x.com`, name }) })

describe('GET /powerups/predictions/me', () => {
  it('juan (seed) tiene powerups', async () => {
    await loginAs('sub-juan', 'Juan')
    const body = await (await get('/powerups/predictions/me')).json()
    expect(body.darkHorse).toMatchObject({ teamId: 'tA4', isTop8: false })
    expect(body.disappointment).toMatchObject({ teamId: 'tA1', isTop8: true })
  })
  it('luis (sin powerups) → null/null', async () => {
    await loginAs('sub-luis', 'Luis')
    const body = await (await get('/powerups/predictions/me')).json()
    expect(body).toMatchObject({ darkHorse: null, disappointment: null })
  })
})

describe('POST /powerups/predictions', () => {
  it('luis crea powerups válidos → 201', async () => {
    await loginAs('sub-luis', 'Luis')
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ darkHorse: { teamId: 'tB4' }, disappointment: { teamId: 'tB1' } })
  })
  it('juan ya tiene → 409 POWERUPS_ALREADY_EXISTS', async () => {
    await loginAs('sub-juan', 'Juan')
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'POWERUPS_ALREADY_EXISTS' })
  })
  it('400 INVALID_DARK_HORSE si darkHorse es top8', async () => {
    await loginAs('sub-luis', 'Luis')
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tA1', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_DARK_HORSE' })
  })
  it('400 INVALID_DISAPPOINTMENT si disappointment no es top8', async () => {
    await loginAs('sub-luis', 'Luis')
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB4' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_DISAPPOINTMENT' })
  })
  it('423 PREDICTIONS_LOCKED en borde exacto', async () => {
    await loginAs('sub-luis', 'Luis')
    setNow(db.tournamentStartAt)
    const res = await send('/powerups/predictions', 'POST', { darkHorseTeamId: 'tB4', disappointmentTeamId: 'tB1' })
    expect(res.status).toBe(423)
    expect(await res.json()).toMatchObject({ code: 'PREDICTIONS_LOCKED' })
  })
})

describe('PUT /powerups/predictions', () => {
  it('juan edita → 200', async () => {
    await loginAs('sub-juan', 'Juan')
    const res = await send('/powerups/predictions', 'PUT', { darkHorseTeamId: 'tC4', disappointmentTeamId: 'tC1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ darkHorse: { teamId: 'tC4' } })
  })
  it('luis (sin powerups) edita → 404 POWERUPS_NOT_FOUND', async () => {
    await loginAs('sub-luis', 'Luis')
    const res = await send('/powerups/predictions', 'PUT', { darkHorseTeamId: 'tC4', disappointmentTeamId: 'tC1' })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'POWERUPS_NOT_FOUND' })
  })
})

describe('GET /powerups/predictions/friends — gating', () => {
  it('antes del torneo → available:false', async () => {
    await loginAs('sub-juan', 'Juan')
    const body = await (await get('/powerups/predictions/friends')).json()
    expect(body.available).toBe(false)
    expect(body.availableAt).toBe(db.tournamentStartAt)
  })
  it('iniciado → available:true, excluye admin y actual', async () => {
    await loginAs('sub-juan', 'Juan')
    setNow(db.tournamentStartAt)
    const body = await (await get('/powerups/predictions/friends')).json()
    expect(body.available).toBe(true)
    const ids = body.data.map((d: { participant: { id: string } }) => d.participant.id)
    expect(ids).not.toContain('p-juan')
    expect(ids).not.toContain('p-admin')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/mocks/handlers/powerups.test.ts`
Expected: FAIL — request sin handler.

- [ ] **Step 3: Implementar `src/mocks/handlers/powerups.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { now } from '../../lib/clock'
import { err, requireSession, groupsLocked } from './_shared'
import { powerupsPointsFor } from '../scoring'

const teamById = (id: string) => db.teams.find((t) => t.id === id)
function powerupTeam(id: string | null) {
  if (!id) return null
  const t = teamById(id); return t ? { teamId: t.id, name: t.name, code: t.code, isTop8: t.isTop8 } : null
}
function serializeMine(pid: string) {
  const pw = db.powerups.find((x) => x.participantId === pid)
  return {
    darkHorse: powerupTeam(pw?.darkHorseTeamId ?? null),
    disappointment: powerupTeam(pw?.disappointmentTeamId ?? null),
    pointsEarned: powerupsPointsFor(db, pid),
  }
}
function validateEligibility(darkHorseTeamId: string, disappointmentTeamId: string) {
  const dh = teamById(darkHorseTeamId), d = teamById(disappointmentTeamId)
  if (!dh || dh.isTop8) return err('INVALID_DARK_HORSE', 'El caballo negro debe ser un equipo fuera del top 8 FIFA', 400)
  if (!d || !d.isTop8) return err('INVALID_DISAPPOINTMENT', 'La decepción debe ser un equipo dentro del top 8 FIFA', 400)
  return null
}

export const powerupsHandlers = [
  http.get('/api/powerups/predictions/me', () => {
    const s = requireSession(); if (s.response) return s.response
    return HttpResponse.json(serializeMine(s.participant.id), { status: 200 })
  }),

  http.post('/api/powerups/predictions', async ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    if (groupsLocked()) return err('PREDICTIONS_LOCKED', 'Los powerups están cerrados', 423)
    const body = (await request.json()) as { darkHorseTeamId: string; disappointmentTeamId: string }
    const bad = validateEligibility(body.darkHorseTeamId, body.disappointmentTeamId)
    if (bad) return bad
    const pid = s.participant.id
    if (db.powerups.some((x) => x.participantId === pid)) return err('POWERUPS_ALREADY_EXISTS', 'Ya tienes powerups registrados', 409)
    db.powerups.push({ participantId: pid, darkHorseTeamId: body.darkHorseTeamId, disappointmentTeamId: body.disappointmentTeamId })
    return HttpResponse.json(serializeMine(pid), { status: 201 })
  }),

  http.put('/api/powerups/predictions', async ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    if (groupsLocked()) return err('PREDICTIONS_LOCKED', 'Los powerups están cerrados', 423)
    const body = (await request.json()) as { darkHorseTeamId: string; disappointmentTeamId: string }
    const bad = validateEligibility(body.darkHorseTeamId, body.disappointmentTeamId)
    if (bad) return bad
    const pid = s.participant.id
    const existing = db.powerups.find((x) => x.participantId === pid)
    if (!existing) return err('POWERUPS_NOT_FOUND', 'No tienes powerups registrados', 404)
    existing.darkHorseTeamId = body.darkHorseTeamId
    existing.disappointmentTeamId = body.disappointmentTeamId
    return HttpResponse.json(serializeMine(pid), { status: 200 })
  }),

  http.get('/api/powerups/predictions/friends', () => {
    const s = requireSession(); if (s.response) return s.response
    if (now() < Date.parse(db.tournamentStartAt)) return HttpResponse.json({ available: false, availableAt: db.tournamentStartAt }, { status: 200 })
    const meId = s.participant.id
    const data = db.participants.filter((p) => p.id !== meId && p.role !== 'admin').map((p) => {
      const pw = db.powerups.find((x) => x.participantId === p.id)
      return { participant: { id: p.id, name: p.name }, darkHorse: powerupTeam(pw?.darkHorseTeamId ?? null), disappointment: powerupTeam(pw?.disappointmentTeamId ?? null) }
    })
    return HttpResponse.json({ available: true, data }, { status: 200 })
  }),
]
```

- [ ] **Step 4: Registrar en `src/mocks/handlers/index.ts`**

```ts
import { authHandlers } from './auth'
import { groupsHandlers } from './groups'
import { powerupsHandlers } from './powerups'

export const handlers = [...authHandlers, ...groupsHandlers, ...powerupsHandlers]
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run src/mocks/handlers/powerups.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/handlers/powerups.ts src/mocks/handlers/powerups.test.ts src/mocks/handlers/index.ts
git commit -m "feat: handler de powerups (elegibilidad isTop8, 409/404, candado, amigos) con tests"
```

---

## Task 9: Capa de datos y pantalla de powerups

**Files:**
- Create: `src/features/powerups/api.ts`, `src/features/powerups/hooks.ts`, `src/features/powerups/PowerupsForm.tsx`

- [ ] **Step 1: Implementar `src/features/powerups/api.ts`**

```ts
import { request } from '../../lib/apiClient'
import type { MyPowerups, SavePowerupsBody, FriendsPowerups } from '../../types/api'

export const getMyPowerups = () => request<MyPowerups>('GET', '/powerups/predictions/me')
export const createPowerups = (body: SavePowerupsBody) => request<MyPowerups>('POST', '/powerups/predictions', { body })
export const updatePowerups = (body: SavePowerupsBody) => request<MyPowerups>('PUT', '/powerups/predictions', { body })
export const getFriendsPowerups = () => request<FriendsPowerups>('GET', '/powerups/predictions/friends')
```

- [ ] **Step 2: Implementar `src/features/powerups/hooks.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { useAuth } from '../../auth/useAuth'
import { getMyPowerups, createPowerups, updatePowerups, getFriendsPowerups } from './api'
import type { SavePowerupsBody } from '../../types/api'

export function usePowerups() {
  const { participant } = useAuth()
  return useQuery({ queryKey: keys.powerups.me(participant?.id ?? 'anon'), queryFn: getMyPowerups, enabled: !!participant })
}
export function useSavePowerups(mode: 'create' | 'update') {
  const qc = useQueryClient(); const { participant } = useAuth()
  return useMutation({
    mutationFn: (body: SavePowerupsBody) => (mode === 'create' ? createPowerups(body) : updatePowerups(body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.powerups.me(participant?.id ?? 'anon') }),
  })
}
export function useFriendsPowerups() {
  return useQuery({ queryKey: keys.powerups.friends(), queryFn: getFriendsPowerups })
}
```

- [ ] **Step 3: Implementar `src/features/powerups/PowerupsForm.tsx`**

```tsx
import { useState } from 'react'
import { useGroups } from '../groups/hooks'
import { usePowerups, useSavePowerups } from './hooks'
import { isApiError } from '../../lib/errors'

export function PowerupsForm() {
  const groups = useGroups()
  const mine = usePowerups()
  const [darkHorse, setDarkHorse] = useState('')
  const [disappointment, setDisappointment] = useState('')
  const [message, setMessage] = useState('')
  const hasPowerups = !!(mine.data?.darkHorse || mine.data?.disappointment)
  const save = useSavePowerups(hasPowerups ? 'update' : 'create')

  if (groups.isLoading || mine.isLoading) return <p>Cargando…</p>
  const teams = (groups.data?.data ?? []).flatMap((g) => g.teams)
  const notTop8 = teams.filter((t) => !t.isTop8)
  const top8 = teams.filter((t) => t.isTop8)
  const dh = darkHorse || mine.data?.darkHorse?.teamId || ''
  const dis = disappointment || mine.data?.disappointment?.teamId || ''

  function onSave() {
    setMessage('')
    save.mutate({ darkHorseTeamId: dh, disappointmentTeamId: dis }, {
      onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error'),
    })
  }
  return (
    <div>
      <h1>Powerups</h1>
      <label htmlFor="dh">Caballo negro (fuera del top 8)</label>
      <select id="dh" value={dh} onChange={(e) => setDarkHorse(e.target.value)}>
        <option value="">—</option>
        {notTop8.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
      </select>
      <label htmlFor="dis">Decepción (dentro del top 8)</label>
      <select id="dis" value={dis} onChange={(e) => setDisappointment(e.target.value)}>
        <option value="">—</option>
        {top8.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.code})</option>)}
      </select>
      <button onClick={onSave} disabled={save.isPending || !dh || !dis}>{hasPowerups ? 'Actualizar' : 'Guardar'}</button>
      {message && <p role="alert">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/features/powerups/api.ts src/features/powerups/hooks.ts src/features/powerups/PowerupsForm.tsx
git commit -m "feat: api, hooks y pantalla bare de powerups"
```

---

# FASE 5 — Eliminatorias (KO)

## Task 10: Handler de KO (`ko.ts`) — TDD

**Files:**
- Create: `src/mocks/handlers/ko.ts`
- Test: `src/mocks/handlers/ko.test.ts`
- Modify: `src/mocks/handlers/index.ts`

- [ ] **Step 1: Escribir el test que falla (`src/mocks/handlers/ko.test.ts`)**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setNow } from '../../lib/clock'
import { db } from '../db'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const send = (p: string, method: 'POST' | 'PUT', body: unknown) =>
  fetch(URL(p), { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const loginAs = (sub: string, name: string) => send('/auth/login', 'POST', { credential: makeFakeIdToken({ sub, email: `${name}@x.com`, name }) })
// partidos abiertos: scheduled con homeTeam y lockedAt en el futuro respecto a now de test (2026-06-06)
const openMatches = () => db.koMatches.filter((m) => m.status === 'scheduled' && m.homeTeamId && Date.parse(m.lockedAt) > Date.parse('2026-06-06T12:00:00.000Z'))

beforeEach(async () => { await loginAs('sub-juan', 'Juan') })

describe('GET /ko/matches', () => {
  it('lista r32 con round + matches; 400 si roundSlug inválido', async () => {
    const body = await (await get('/ko/matches?roundSlug=r32')).json()
    expect(body.round.slug).toBe('r32')
    expect(body.matches.length).toBeGreaterThan(0)
    const bad = await get('/ko/matches?roundSlug=zzz')
    expect(bad.status).toBe(400)
    expect(await bad.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
  })
  it('myPrediction.lockedIn refleja now >= lockedAt en partido finished que juan predijo', async () => {
    const body = await (await get('/ko/matches?roundSlug=r32')).json()
    const m = body.matches.find((x: { id: string }) => x.id === 'ko-r32-1')
    expect(m.myPrediction).not.toBeNull()
    expect(m.myPrediction.lockedIn).toBe(true)
    expect(m.myPrediction.pointsEarned).not.toBeNull()
  })
})

describe('GET /ko/matches/:id', () => {
  it('404 MATCH_NOT_FOUND', async () => {
    const res = await get('/ko/matches/nope')
    expect(res.status).toBe(404)
  })
})

describe('MATCH_LOCKED / MATCH_FINISHED', () => {
  it('partido finished → 423 MATCH_FINISHED', async () => {
    const fin = db.koMatches.find((m) => m.status === 'finished')!
    const res = await send(`/ko/matches/${fin.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: fin.homeTeamId })
    expect(res.status).toBe(423)
    expect(await res.json()).toMatchObject({ code: 'MATCH_FINISHED' })
  })
  it('now == lockedAt → 423 MATCH_LOCKED; 1ms antes → 201', async () => {
    const m = openMatches()[0]
    setNow(m.lockedAt)
    let res = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId })
    expect(res.status).toBe(423)
    setNow(new Date(Date.parse(m.lockedAt) - 1).toISOString())
    res = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId })
    expect(res.status).toBe(201)
  })
})

describe('POST validaciones', () => {
  it('400 INVALID_TEAM_ADVANCES', async () => {
    const m = openMatches()[0]
    const res = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: 'ajeno' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'INVALID_TEAM_ADVANCES' })
  })
  it('409 PREDICTION_ALREADY_EXISTS', async () => {
    const m = openMatches()[0]
    await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId })
    const again = await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 2, scoreAway: 2, teamAdvancesId: m.homeTeamId })
    expect(again.status).toBe(409)
    expect(await again.json()).toMatchObject({ code: 'PREDICTION_ALREADY_EXISTS' })
  })
})

describe('triple — 4 transiciones + tope global 3 (§9.3.1)', () => {
  it('POST con triple consume; 4º triple → 400 TRIPLE_USES_EXHAUSTED', async () => {
    const ms = openMatches()
    for (let i = 0; i < 3; i++) {
      const r = await send(`/ko/matches/${ms[i].id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: ms[i].homeTeamId, tripleActive: true })
      expect(r.status).toBe(201)
      expect((await r.json()).tripleUsesRemaining).toBe(3 - (i + 1))
    }
    const exhausted = await send(`/ko/matches/${ms[3].id}/predictions`, 'POST', { scoreHome: 0, scoreAway: 0, teamAdvancesId: ms[3].homeTeamId, tripleActive: true })
    expect(exhausted.status).toBe(400)
    expect(await exhausted.json()).toMatchObject({ code: 'TRIPLE_USES_EXHAUSTED' })
  })
  it('PUT false→true consume; true→false libera; idempotencias sin cambio', async () => {
    const m = openMatches()[0]
    await send(`/ko/matches/${m.id}/predictions`, 'POST', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: false })
    let r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 1, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: true })
    expect((await r.json()).tripleUsesRemaining).toBe(2)
    r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 2, scoreAway: 1, teamAdvancesId: m.homeTeamId, tripleActive: true })
    expect((await r.json()).tripleUsesRemaining).toBe(2)
    r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 2, scoreAway: 1, teamAdvancesId: m.homeTeamId, tripleActive: false })
    expect((await r.json()).tripleUsesRemaining).toBe(3)
    r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 0, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: false })
    expect((await r.json()).tripleUsesRemaining).toBe(3)
  })
  it('PUT 404 PREDICTION_NOT_FOUND si no existe', async () => {
    const m = openMatches()[2]
    const r = await send(`/ko/matches/${m.id}/predictions`, 'PUT', { scoreHome: 0, scoreAway: 0, teamAdvancesId: m.homeTeamId, tripleActive: false })
    expect(r.status).toBe(404)
    expect(await r.json()).toMatchObject({ code: 'PREDICTION_NOT_FOUND' })
  })
})

describe('friends KO — gating por scheduledAt', () => {
  it('antes de scheduledAt → available:false + availableAt + data:null', async () => {
    const m = openMatches()[0]
    setNow(new Date(Date.parse(m.scheduledAt) - 1000).toISOString())
    const body = await (await get(`/ko/matches/${m.id}/predictions/friends`)).json()
    expect(body).toMatchObject({ available: false, matchId: m.id, availableAt: m.scheduledAt, data: null })
  })
  it('now >= scheduledAt → available:true, excluye admin/actual', async () => {
    const m = openMatches()[0]
    setNow(m.scheduledAt)
    const body = await (await get(`/ko/matches/${m.id}/predictions/friends`)).json()
    expect(body.available).toBe(true)
    const ids = body.data.map((d: { participant: { id: string } }) => d.participant.id)
    expect(ids).not.toContain('p-juan')
    expect(ids).not.toContain('p-admin')
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/mocks/handlers/ko.test.ts`
Expected: FAIL — request sin handler.

- [ ] **Step 3: Implementar `src/mocks/handlers/ko.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { db, type DbKoMatch, type DbKoPrediction } from '../db'
import { ROUND_SLUGS, type RoundSlug } from '../../types/enums'
import { now } from '../../lib/clock'
import { err, requireSession } from './_shared'
import { koPointsFor } from '../scoring'

const TRIPLE_CAP = 3
const matchLocked = (m: DbKoMatch) => now() >= Date.parse(m.lockedAt)
const predOf = (pid: string, mid: string) => db.koPredictions.find((p) => p.participantId === pid && p.matchId === mid)
const tripleUsed = (pid: string) => db.koPredictions.filter((p) => p.participantId === pid && p.tripleActive).length
function koTeam(id: string | null) {
  if (!id) return null
  const t = db.teams.find((x) => x.id === id); return t ? { id: t.id, name: t.name, code: t.code } : null
}
function serializeMatch(m: DbKoMatch, pid: string) {
  const mp = predOf(pid, m.id)
  return {
    id: m.id, externalMatchId: m.externalMatchId, matchNumber: m.matchNumber, scheduledAt: m.scheduledAt, lockedAt: m.lockedAt,
    status: m.status, homeTeam: koTeam(m.homeTeamId), awayTeam: koTeam(m.awayTeamId),
    homeTeamLabel: m.homeTeamLabel, awayTeamLabel: m.awayTeamLabel, result: m.result,
    myPrediction: mp ? {
      scoreHome: mp.scoreHome, scoreAway: mp.scoreAway, teamAdvancesId: mp.teamAdvancesId, tripleActive: mp.tripleActive,
      lockedIn: now() >= Date.parse(m.lockedAt), pointsEarned: m.result ? koPointsFor(db, pid, m.id) : null,
    } : null,
  }
}

export const koHandlers = [
  http.get('/api/ko/matches', ({ request }) => {
    const s = requireSession(); if (s.response) return s.response
    const slug = new URL(request.url).searchParams.get('roundSlug')
    if (!slug || !ROUND_SLUGS.includes(slug as RoundSlug)) return err('VALIDATION_ERROR', 'roundSlug es requerido', 400)
    const round = db.koRounds.find((r) => r.slug === slug)!
    const matches = db.koMatches.filter((m) => m.roundSlug === slug).sort((a, b) => a.matchNumber - b.matchNumber).map((m) => serializeMatch(m, s.participant.id))
    return HttpResponse.json({ round, matches }, { status: 200 })
  }),

  http.get('/api/ko/matches/:matchId', ({ params }) => {
    const s = requireSession(); if (s.response) return s.response
    const m = db.koMatches.find((x) => x.id === params.matchId)
    if (!m) return err('MATCH_NOT_FOUND', 'Partido no encontrado', 404)
    return HttpResponse.json(serializeMatch(m, s.participant.id), { status: 200 })
  }),

  http.post('/api/ko/matches/:matchId/predictions', async ({ params, request }) => {
    const s = requireSession(); if (s.response) return s.response
    const m = db.koMatches.find((x) => x.id === params.matchId)
    if (!m) return err('MATCH_NOT_FOUND', 'Partido no encontrado', 404)
    if (m.status === 'finished') return err('MATCH_FINISHED', 'El partido ya tiene resultado oficial', 423)
    if (matchLocked(m)) return err('MATCH_LOCKED', 'El partido está cerrado para predicciones', 423)
    const body = (await request.json()) as { scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive?: boolean }
    if (body.teamAdvancesId !== m.homeTeamId && body.teamAdvancesId !== m.awayTeamId) return err('INVALID_TEAM_ADVANCES', 'teamAdvancesId no corresponde a un equipo del partido', 400)
    const pid = s.participant.id
    if (predOf(pid, m.id)) return err('PREDICTION_ALREADY_EXISTS', 'Ya existe una predicción para este partido', 409)
    const wantsTriple = body.tripleActive === true
    if (wantsTriple && tripleUsed(pid) >= TRIPLE_CAP) return err('TRIPLE_USES_EXHAUSTED', 'No tienes usos de triple o nada disponibles', 400)
    db.koPredictions.push({ participantId: pid, matchId: m.id, scoreHome: body.scoreHome, scoreAway: body.scoreAway, teamAdvancesId: body.teamAdvancesId, tripleActive: wantsTriple })
    return HttpResponse.json({ ok: true, tripleUsesRemaining: TRIPLE_CAP - tripleUsed(pid) }, { status: 201 })
  }),

  http.put('/api/ko/matches/:matchId/predictions', async ({ params, request }) => {
    const s = requireSession(); if (s.response) return s.response
    const m = db.koMatches.find((x) => x.id === params.matchId)
    if (!m) return err('MATCH_NOT_FOUND', 'Partido no encontrado', 404)
    if (m.status === 'finished') return err('MATCH_FINISHED', 'El partido ya tiene resultado oficial', 423)
    if (matchLocked(m)) return err('MATCH_LOCKED', 'El partido está cerrado para predicciones', 423)
    const body = (await request.json()) as { scoreHome: number; scoreAway: number; teamAdvancesId: string; tripleActive: boolean }
    if (body.teamAdvancesId !== m.homeTeamId && body.teamAdvancesId !== m.awayTeamId) return err('INVALID_TEAM_ADVANCES', 'teamAdvancesId no corresponde a un equipo del partido', 400)
    const pid = s.participant.id
    const existing = predOf(pid, m.id)
    if (!existing) return err('PREDICTION_NOT_FOUND', 'No existe predicción para este partido', 404)
    const was = existing.tripleActive, wants = body.tripleActive === true
    if (!was && wants && tripleUsed(pid) >= TRIPLE_CAP) return err('TRIPLE_USES_EXHAUSTED', 'No tienes usos de triple o nada disponibles', 400)
    existing.scoreHome = body.scoreHome; existing.scoreAway = body.scoreAway
    existing.teamAdvancesId = body.teamAdvancesId; existing.tripleActive = wants
    return HttpResponse.json({ ok: true, tripleUsesRemaining: TRIPLE_CAP - tripleUsed(pid) }, { status: 200 })
  }),

  http.get('/api/ko/matches/:matchId/predictions/friends', ({ params }) => {
    const s = requireSession(); if (s.response) return s.response
    const m = db.koMatches.find((x) => x.id === params.matchId)
    if (!m) return err('MATCH_NOT_FOUND', 'Partido no encontrado', 404)
    if (now() < Date.parse(m.scheduledAt)) return HttpResponse.json({ available: false, matchId: m.id, availableAt: m.scheduledAt, data: null }, { status: 200 })
    const meId = s.participant.id
    const data = db.participants.filter((p) => p.id !== meId && p.role !== 'admin').map((p) => {
      const pr = predOf(p.id, m.id)
      return { participant: { id: p.id, name: p.name }, prediction: pr ? { scoreHome: pr.scoreHome, scoreAway: pr.scoreAway, teamAdvancesId: pr.teamAdvancesId, tripleActive: pr.tripleActive } : null }
    })
    return HttpResponse.json({ available: true, matchId: m.id, availableAt: null, data }, { status: 200 })
  }),
]
```

- [ ] **Step 4: Registrar en `src/mocks/handlers/index.ts`**

```ts
import { authHandlers } from './auth'
import { groupsHandlers } from './groups'
import { powerupsHandlers } from './powerups'
import { koHandlers } from './ko'

export const handlers = [...authHandlers, ...groupsHandlers, ...powerupsHandlers, ...koHandlers]
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run src/mocks/handlers/ko.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/handlers/ko.ts src/mocks/handlers/ko.test.ts src/mocks/handlers/index.ts
git commit -m "feat: handler de KO (candados, triple §9.3.1, amigos por scheduledAt) con tests"
```

---

## Task 11: Capa de datos y pantallas de KO

**Files:**
- Create: `src/features/ko/api.ts`, `src/features/ko/hooks.ts`, `src/features/ko/KoRoundList.tsx`, `src/features/ko/KoRoundDetail.tsx`, `src/features/ko/KoMatchDetail.tsx`

- [ ] **Step 1: Implementar `src/features/ko/api.ts`**

```ts
import { request } from '../../lib/apiClient'
import type { KoMatchesResponse, KoMatch, SaveKoPredictionBody, SaveKoPredictionResponse, FriendsKo } from '../../types/api'
import type { RoundSlug } from '../../types/enums'

export const getKoMatches = (round: RoundSlug) => request<KoMatchesResponse>('GET', '/ko/matches', { query: { roundSlug: round } })
export const getKoMatch = (id: string) => request<KoMatch>('GET', `/ko/matches/${id}`)
export const createKoPrediction = (id: string, body: SaveKoPredictionBody) => request<SaveKoPredictionResponse>('POST', `/ko/matches/${id}/predictions`, { body })
export const updateKoPrediction = (id: string, body: SaveKoPredictionBody) => request<SaveKoPredictionResponse>('PUT', `/ko/matches/${id}/predictions`, { body })
export const getFriendsKo = (id: string) => request<FriendsKo>('GET', `/ko/matches/${id}/predictions/friends`)
```

- [ ] **Step 2: Implementar `src/features/ko/hooks.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { getKoMatches, getKoMatch, createKoPrediction, updateKoPrediction, getFriendsKo } from './api'
import type { RoundSlug } from '../../types/enums'
import type { SaveKoPredictionBody } from '../../types/api'

export function useKoMatches(round: RoundSlug) {
  return useQuery({ queryKey: keys.ko.round(round), queryFn: () => getKoMatches(round) })
}
export function useKoMatch(id: string) {
  return useQuery({ queryKey: keys.ko.match(id), queryFn: () => getKoMatch(id), enabled: !!id })
}
export function useSaveKoPrediction(id: string, mode: 'create' | 'update') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveKoPredictionBody) => (mode === 'create' ? createKoPrediction(id, body) : updateKoPrediction(id, body)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.ko.match(id) }) },
  })
}
export function useFriendsKo(id: string) {
  return useQuery({ queryKey: keys.ko.friends(id), queryFn: () => getFriendsKo(id), enabled: !!id })
}
```

- [ ] **Step 3: Implementar `src/features/ko/KoRoundList.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { ROUND_SLUGS } from '../../types/enums'

const NAMES: Record<string, string> = { r32: 'Dieciseisavos', r16: 'Octavos', qf: 'Cuartos', sf: 'Semifinal', '3rd': 'Tercer puesto', final: 'Final' }

export function KoRoundList() {
  return (
    <div>
      <h1>Eliminatorias</h1>
      <ul>
        {ROUND_SLUGS.map((slug) => (
          <li key={slug}><Link to={`/eliminatorias/${slug}`}>{NAMES[slug]}</Link></li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Implementar `src/features/ko/KoRoundDetail.tsx`**

```tsx
import { Link, useParams } from 'react-router-dom'
import { useKoMatches } from './hooks'
import type { RoundSlug } from '../../types/enums'

export function KoRoundDetail() {
  const { round = 'r32' } = useParams()
  const q = useKoMatches(round as RoundSlug)
  if (q.isLoading) return <p>Cargando…</p>
  if (q.error) return <p role="alert">Error al cargar la ronda</p>
  return (
    <div>
      <h1>{q.data?.round.name}</h1>
      <ul>
        {q.data?.matches.map((m) => (
          <li key={m.id}>
            <Link to={`/eliminatorias/partido/${m.id}`}>
              {(m.homeTeam?.name ?? m.homeTeamLabel)} vs {(m.awayTeam?.name ?? m.awayTeamLabel)} [{m.status}]
              {m.result ? ` ${m.result.scoreHome}-${m.result.scoreAway}` : ''}
              {m.myPrediction ? ' ✎' : ''}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Implementar `src/features/ko/KoMatchDetail.tsx`**

```tsx
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useKoMatch, useSaveKoPrediction, useFriendsKo } from './hooks'
import { isApiError } from '../../lib/errors'

export function KoMatchDetail() {
  const { matchId = '' } = useParams()
  const q = useKoMatch(matchId)
  const friends = useFriendsKo(matchId)
  const [scoreHome, setScoreHome] = useState(0)
  const [scoreAway, setScoreAway] = useState(0)
  const [advances, setAdvances] = useState('')
  const [triple, setTriple] = useState(false)
  const [message, setMessage] = useState('')
  const m = q.data
  const hasPrediction = !!m?.myPrediction
  const save = useSaveKoPrediction(matchId, hasPrediction ? 'update' : 'create')

  if (q.isLoading) return <p>Cargando…</p>
  if (!m) return <p role="alert">Partido no encontrado</p>
  const home = m.homeTeam, away = m.awayTeam
  const adv = advances || m.myPrediction?.teamAdvancesId || ''

  function onSave() {
    setMessage('')
    save.mutate({ scoreHome, scoreAway, teamAdvancesId: adv, tripleActive: triple }, {
      onSuccess: () => setMessage('Guardado'), onError: (e) => setMessage(isApiError(e) ? e.message : 'Error'),
    })
  }
  return (
    <div>
      <h1>{(home?.name ?? m.homeTeamLabel)} vs {(away?.name ?? m.awayTeamLabel)}</h1>
      <p>Estado: {m.status} {m.result ? `· Resultado ${m.result.scoreHome}-${m.result.scoreAway}` : ''}</p>
      {home && away ? (
        <fieldset disabled={m.myPrediction?.lockedIn || m.status === 'finished'}>
          <label>Marcador {home.code} <input type="number" min={0} value={scoreHome} onChange={(e) => setScoreHome(+e.target.value)} /></label>
          <label>Marcador {away.code} <input type="number" min={0} value={scoreAway} onChange={(e) => setScoreAway(+e.target.value)} /></label>
          <label>Avanza
            <select value={adv} onChange={(e) => setAdvances(e.target.value)}>
              <option value="">—</option>
              <option value={home.id}>{home.name}</option>
              <option value={away.id}>{away.name}</option>
            </select>
          </label>
          <label><input type="checkbox" checked={triple} onChange={(e) => setTriple(e.target.checked)} /> Triple o nada</label>
          <button onClick={onSave} disabled={save.isPending || !adv}>Guardar</button>
        </fieldset>
      ) : <p>Cruce aún no definido.</p>}
      {message && <p role="alert">{message}</p>}
      <h2>Amigos</h2>
      {friends.isLoading ? <p>Cargando…</p> : friends.data?.available
        ? <ul>{friends.data.data?.map((f) => <li key={f.participant.id}>{f.participant.name}: {f.prediction ? `${f.prediction.scoreHome}-${f.prediction.scoreAway}` : 'sin predicción'}</li>)}</ul>
        : <p>Disponible el {friends.data?.availableAt}</p>}
    </div>
  )
}
```

- [ ] **Step 6: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/features/ko/
git commit -m "feat: api, hooks y pantallas bare de eliminatorias (ronda, partido, amigos KO)"
```

---

# FASE 6 — Scoreboard, breakdown, amigos, hub/revisar y cierre

## Task 12: Handler de scoreboard (`scoreboard.ts`) — TDD

**Files:**
- Create: `src/mocks/handlers/scoreboard.ts`
- Test: `src/mocks/handlers/scoreboard.test.ts`
- Modify: `src/mocks/handlers/index.ts`

- [ ] **Step 1: Escribir el test que falla (`src/mocks/handlers/scoreboard.test.ts`)**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { makeFakeIdToken } from '../jwt'

const URL = (p: string) => `http://localhost/api${p}`
const get = (p: string) => fetch(URL(p), { credentials: 'include' })
const post = (p: string, body: unknown) =>
  fetch(URL(p), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' })
const login = () => post('/auth/login', { credential: makeFakeIdToken({ sub: 'sub-juan', email: 'juan@gmail.com', name: 'Juan' }) })

beforeEach(async () => { await login() })

describe('GET /scoreboard', () => {
  it('devuelve {updatedAt, data} ordenado, excluye admin, juan antes que maria (desempate)', async () => {
    const body = await (await get('/scoreboard')).json()
    expect(typeof body.updatedAt).toBe('string')
    expect(body.data.some((e: { participant: { id: string } }) => e.participant.id === 'p-admin')).toBe(false)
    const iJuan = body.data.findIndex((e: { participant: { id: string } }) => e.participant.id === 'p-juan')
    const iMaria = body.data.findIndex((e: { participant: { id: string } }) => e.participant.id === 'p-maria')
    expect(iJuan).toBeLessThan(iMaria)
    expect(body.data[0].rank).toBe(1)
    expect(body.data[0].prize).toBe(700000)
  })
})

describe('GET /scoreboard/:id/breakdown', () => {
  it('coherente con el scoreboard (mismo total y prize)', async () => {
    const sb = await (await get('/scoreboard')).json()
    const top = sb.data[0]
    const bd = await (await get(`/scoreboard/${top.participant.id}/breakdown`)).json()
    expect(bd.total).toBe(top.total)
    expect(bd.prize).toBe(top.prize)
    expect(bd.breakdown).toHaveProperty('groups')
    expect(bd.breakdown).toHaveProperty('ko')
  })
  it('404 PARTICIPANT_NOT_FOUND', async () => {
    const res = await get('/scoreboard/nope/breakdown')
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ code: 'PARTICIPANT_NOT_FOUND' })
  })
})
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/mocks/handlers/scoreboard.test.ts`
Expected: FAIL — request sin handler.

- [ ] **Step 3: Implementar `src/mocks/handlers/scoreboard.ts`**

```ts
import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { now } from '../../lib/clock'
import { err, requireSession } from './_shared'
import { computeScoreboard, computeBreakdown, prizeForParticipant } from '../scoring'

export const scoreboardHandlers = [
  http.get('/api/scoreboard', () => {
    const s = requireSession(); if (s.response) return s.response
    return HttpResponse.json({ updatedAt: new Date(now()).toISOString(), data: computeScoreboard(db) }, { status: 200 })
  }),

  http.get('/api/scoreboard/:participantId/breakdown', ({ params }) => {
    const s = requireSession(); if (s.response) return s.response
    const id = String(params.participantId)
    if (!db.participants.some((p) => p.id === id)) return err('PARTICIPANT_NOT_FOUND', 'Participante no encontrado', 404)
    const bd = computeBreakdown(db, id)
    return HttpResponse.json({ ...bd, prize: prizeForParticipant(db, id) }, { status: 200 })
  }),
]
```

- [ ] **Step 4: Registrar en `src/mocks/handlers/index.ts`**

```ts
import { authHandlers } from './auth'
import { groupsHandlers } from './groups'
import { powerupsHandlers } from './powerups'
import { koHandlers } from './ko'
import { scoreboardHandlers } from './scoreboard'

export const handlers = [...authHandlers, ...groupsHandlers, ...powerupsHandlers, ...koHandlers, ...scoreboardHandlers]
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `npx vitest run src/mocks/handlers/scoreboard.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/handlers/scoreboard.ts src/mocks/handlers/scoreboard.test.ts src/mocks/handlers/index.ts
git commit -m "feat: handler de scoreboard y breakdown (orden, desempate, premios, 404) con tests"
```

---

## Task 13: Capa de datos y pantallas de tabla + amigos

**Files:**
- Create: `src/features/scoreboard/api.ts`, `src/features/scoreboard/hooks.ts`, `src/features/scoreboard/Scoreboard.tsx`, `src/features/scoreboard/Breakdown.tsx`

- [ ] **Step 1: Implementar `src/features/scoreboard/api.ts`**

```ts
import { request } from '../../lib/apiClient'
import type { Scoreboard, ScoreBreakdown } from '../../types/api'

export const getScoreboard = () => request<Scoreboard>('GET', '/scoreboard')
export const getBreakdown = (participantId: string) => request<ScoreBreakdown>('GET', `/scoreboard/${participantId}/breakdown`)
```

- [ ] **Step 2: Implementar `src/features/scoreboard/hooks.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { keys } from '../../lib/queryClient'
import { getScoreboard, getBreakdown } from './api'

export function useScoreboard() {
  return useQuery({ queryKey: keys.scoreboard.all(), queryFn: getScoreboard })
}
export function useBreakdown(participantId: string) {
  return useQuery({ queryKey: keys.scoreboard.breakdown(participantId), queryFn: () => getBreakdown(participantId), enabled: !!participantId })
}
```

- [ ] **Step 3: Implementar `src/features/scoreboard/Scoreboard.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useScoreboard } from './hooks'

export function Scoreboard() {
  const q = useScoreboard()
  if (q.isLoading) return <p>Cargando…</p>
  if (q.error) return <p role="alert">Error al cargar la tabla</p>
  return (
    <div>
      <h1>Tabla de posiciones</h1>
      <ol>
        {q.data?.data.map((e) => (
          <li key={e.participant.id}>
            <Link to={`/tabla/${e.participant.id}`}>#{e.rank} {e.participant.name} — {e.total} pts {e.prize ? `($${e.prize})` : ''}</Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

- [ ] **Step 4: Implementar `src/features/scoreboard/Breakdown.tsx` (incluye amigos grupos/powerups)**

```tsx
import { useParams } from 'react-router-dom'
import { useBreakdown } from './hooks'
import { useFriendsGroups } from '../groups/hooks'
import { useFriendsPowerups } from '../powerups/hooks'

export function Breakdown() {
  const { participantId = '' } = useParams()
  const q = useBreakdown(participantId)
  const fg = useFriendsGroups()
  const fp = useFriendsPowerups()
  if (q.isLoading) return <p>Cargando…</p>
  if (q.error) return <p role="alert">Participante no encontrado</p>
  const b = q.data!
  return (
    <div>
      <h1>Desglose: {b.participant.name}</h1>
      <p>Total: {b.total} · Triples restantes: {b.tripleUsesRemaining} {b.prize ? `· Premio $${b.prize}` : ''}</p>
      <ul>
        <li>Grupos: {b.breakdown.groups}</li>
        <li>Terceros: {b.breakdown.thirds}</li>
        <li>KO: {b.breakdown.ko}</li>
        <li>Caballo negro: {b.breakdown.darkHorse}</li>
        <li>Decepción: {b.breakdown.disappointment}</li>
      </ul>
      <h2>Amigos — grupos</h2>
      {fg.isLoading ? <p>Cargando…</p> : fg.data?.available
        ? <p>{fg.data.data?.length ?? 0} participantes con predicciones</p>
        : <p>Disponible el {fg.data?.availableAt}</p>}
      <h2>Amigos — powerups</h2>
      {fp.isLoading ? <p>Cargando…</p> : fp.data?.available
        ? <ul>{fp.data.data?.map((f) => <li key={f.participant.id}>{f.participant.name}: 🐴 {f.darkHorse?.code ?? '—'} / 💤 {f.disappointment?.code ?? '—'}</li>)}</ul>
        : <p>Disponible el {fp.data?.availableAt}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/features/scoreboard/
git commit -m "feat: api, hooks y pantallas bare de tabla, breakdown y vistas de amigos"
```

---

## Task 14: Hub de predicciones, pantalla revisar y nav del AppShell

**Files:**
- Create: `src/features/predicciones/Hub.tsx`, `src/features/predicciones/Review.tsx`
- Modify: `src/app/AppShell.tsx`

- [ ] **Step 1: Implementar `src/features/predicciones/Hub.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { useMyGroupPredictions } from '../groups/hooks'
import { usePowerups } from '../powerups/hooks'

export function Hub() {
  const groups = useMyGroupPredictions()
  const powerups = usePowerups()
  const hasPowerups = !!(powerups.data?.darkHorse || powerups.data?.disappointment)
  return (
    <div>
      <h1>Predicciones</h1>
      <ul>
        <li><Link to="/predicciones/grupos">Grupos</Link> — {groups.data?.completedGroups ?? 0}/12 completos</li>
        <li><Link to="/predicciones/terceros">Mejores terceros</Link></li>
        <li><Link to="/predicciones/powerups">Powerups</Link> — {hasPowerups ? 'definidos' : 'pendientes'}</li>
        <li><Link to="/predicciones/revisar">Revisar</Link></li>
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Implementar `src/features/predicciones/Review.tsx`**

```tsx
import { useMyGroupPredictions, useThirds } from '../groups/hooks'
import { usePowerups } from '../powerups/hooks'

export function Review() {
  const groups = useMyGroupPredictions()
  const thirds = useThirds()
  const powerups = usePowerups()
  if (groups.isLoading || thirds.isLoading || powerups.isLoading) return <p>Cargando…</p>
  return (
    <div>
      <h1>Revisar predicciones</h1>
      <p>Grupos completos: {groups.data?.completedGroups ?? 0}/12</p>
      <p>Terceros seleccionados: {thirds.data?.selectedCount ?? 0}/8</p>
      <p>Caballo negro: {powerups.data?.darkHorse?.name ?? '—'}</p>
      <p>Decepción: {powerups.data?.disappointment?.name ?? '—'}</p>
    </div>
  )
}
```

- [ ] **Step 3: Actualizar `src/app/AppShell.tsx` (nav con todas las secciones)**

```tsx
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div>
      <main>{children}</main>
      <nav>
        <Link to="/">Inicio</Link> | <Link to="/predicciones">Predicciones</Link> |{' '}
        <Link to="/eliminatorias">Eliminatorias</Link> | <Link to="/tabla">Tabla</Link>
      </nav>
    </div>
  )
}
```

- [ ] **Step 4: Verificar typecheck**

Run: `npx tsc -b`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/features/predicciones/ src/app/AppShell.tsx
git commit -m "feat: hub de predicciones, pantalla revisar y nav completo del AppShell"
```

---

## Task 15: Verificación final de la entrega

- [ ] **Step 1: Suite completa verde + typecheck + lint**

Run: `npx vitest run && npx tsc -b && npm run lint`
Expected: todos los tests PASS (auth + lib + scoring + groups + powerups + ko + scoreboard); typecheck sin errores; lint limpio.

- [ ] **Step 2: Smoke manual en browser de TODAS las navegaciones**

Run: `npm run dev`
Pasos (con sesión sembrada vía login Google real o, si no hay clientId, ajustar manualmente): recorrer `/predicciones` → grupos → editar un grupo y guardar (200) → terceros (marcar 8, guardar) → powerups (guardar/actualizar) → revisar → `/eliminatorias` → una ronda → un partido (guardar predicción) → `/tabla` → breakdown de un participante. Confirmar en la pestaña Network que **cada pantalla dispara su request al servicio** correspondiente (`/api/groups`, `/api/groups/predictions/me`, `/api/groups/thirds`, `/api/powerups/predictions/me`, `/api/ko/matches?roundSlug=...`, `/api/scoreboard`, `/api/scoreboard/{id}/breakdown`).

- [ ] **Step 3: Commit final (si hubo ajustes del smoke)**

```bash
git add -A
git commit -m "chore: verificacion final del cableado del flujo participante"
```

---

## Verificación / criterios de éxito

- **Cada navegación consume su servicio del mock** (objetivo del usuario): al entrar a cualquier ruta participante se dispara el GET correspondiente y las escrituras pegan a su POST/PUT con las validaciones del contrato.
- **Suite TDD verde:** handlers (groups/powerups/ko/scoreboard) + motor scoring + (auth/lib previos). Ramas cubiertas: candados borde exacto (grupos/KO), cascada terceros, elegibilidad powerups, 4 transiciones de triple + tope, desempate scoreboard, coherencia scoreboard↔breakdown, gating de amigos, 404/409/423 del contrato.
- **`npx tsc -b` y `npm run lint`** limpios.
- **Swap mock→real preservado:** el front consume flags del server (`lockedIn`, `available`, `pointsEarned`), nunca recalcula candados; el cliente usa `credentials:'include'` + rutas del contrato sin tocar la sesión.

## Notas / decisiones para fases siguientes (no implementar aquí)
- **Admin** (8 pantallas: invitaciones, cargar grupos/partidos/resultados, top8, scoring-params, participantes), **`/health`** y **recálculo disparado por usuario** quedan fuera. El motor `scoring.ts` ya es puro y determinista, listo para que el admin de resultados dispare invalidaciones (RF-08/RF-32) en una fase posterior.
- **`scale_3rd` inexistente:** `ROUND_TO_SCALE['3rd']` reusa `scale_sf` (documentado; coordinar con backend).
- **`devApi.ts`** (dev-bypass de sesión) sigue pendiente del plan de pre-torneo original; útil para el smoke sin Google real.
