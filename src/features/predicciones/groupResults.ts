import type { Group, GroupRanking, GroupPointsEarned } from '../../types/api'
import type { RealTableRow } from './parts'

// El backend de predicciones de grupos NO envía el acierto por ranking (solo predictedPosition).
// Lo calculamos aquí cruzando la posición predicha con la real del standing embebido en GET /groups
// (lo refresca el cron del BE cada 5 min).

export function realPositionByTeam(group: Group | undefined): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of group?.teams ?? []) {
    if (t.standing?.realPosition != null) map.set(t.id, t.standing.realPosition)
  }
  return map
}

// 'exact' si la posición real coincide con la predicha, 'partial' si el equipo ya tiene posición real
// distinta, null mientras el grupo no tenga tabla.
export function positionResult(predicted: number, real: number | undefined): 'exact' | 'partial' | null {
  if (real == null) return null
  return real === predicted ? 'exact' : 'partial'
}

// Rankings con el result calculado desde las posiciones reales del grupo (copia, no muta).
export function rankingsWithResult(rankings: GroupRanking[], group: Group | undefined): GroupRanking[] {
  const realPos = realPositionByTeam(group)
  return rankings.map((r) => ({ ...r, result: positionResult(r.position, realPos.get(r.teamId)) }))
}

// Valor en puntos de un acierto exacto. El backend no expone el scoring param al participante, pero
// pointsEarned.pts_group_position_exact = (#exactos) × (valor unitario), así que lo derivamos del
// primer grupo que ya tenga puntos y exactos. null mientras ningún grupo haya sumado.
export function exactPointValue(
  groups: { rankings: GroupRanking[]; pointsEarned: GroupPointsEarned | null }[],
): number | null {
  for (const g of groups) {
    const exactCount = g.rankings.filter((r) => r.result === 'exact').length
    if (g.pointsEarned && exactCount > 0) return g.pointsEarned.pts_group_position_exact / exactCount
  }
  return null
}

// Filas de la tabla real (standing embebido en GET /groups), ordenadas por posición. null si el
// grupo aún no tiene tabla.
export function realTable(group: Group | undefined): RealTableRow[] | null {
  if (!group) return null
  const rows = group.teams
    .filter((t) => t.standing != null)
    .map((t) => ({ code: t.code, flag: t.flag, standing: t.standing! }))
    .sort((a, b) => (a.standing.realPosition ?? 99) - (b.standing.realPosition ?? 99))
  return rows.length > 0 ? rows : null
}
