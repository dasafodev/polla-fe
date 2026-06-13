import type { Group, GroupRanking } from '../../types/api'

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
