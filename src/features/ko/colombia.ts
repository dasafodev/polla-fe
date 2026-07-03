// Identidad de Colombia en eliminatorias: código, multiplicador ×5, paleta tricolor y detección
// de "partido de Colombia". Fuente única compartida por el héroe del Inicio (home/colombia) y el
// detalle de pronóstico (KoPredictionSheet), para que la decoración salga igual desde cualquier entrada.

import type { KoMatch } from '../../types/api'

// Código FIFA de Colombia.
export const COLOMBIA_CODE = 'COL'

// Multiplicador de puntos de los partidos de Colombia en eliminatorias. Espejo del backend
// (polla-be/prisma/seed.ts → mult_colombia_ko = 5): un partido de Colombia paga 5× los puntos,
// en cualquier ronda. Solo para el informativo; el cálculo real lo hace el backend.
export const MULT_COLOMBIA_KO = 5

// Paleta "amarillo camiseta": fondo amarillo, tipografía/acento navy, rojo de detalle.
export const COLOMBIA_COLORS = { yellow: '#FCD116', navy: '#00318A', red: '#CE1126' } as const
export const COLOMBIA_CONFETTI = [COLOMBIA_COLORS.yellow, COLOMBIA_COLORS.navy, COLOMBIA_COLORS.red, '#ffffff']

// Un partido KO es "de Colombia" si cualquiera de los dos lados lleva el código COL. Como el sheet
// solo abre cruces de eliminatorias, cualquier partido de Colombia aquí paga ×5.
export function isColombiaKoMatch(m: KoMatch | null | undefined): boolean {
  return !!m && (m.homeTeam?.code === COLOMBIA_CODE || m.awayTeam?.code === COLOMBIA_CODE)
}
