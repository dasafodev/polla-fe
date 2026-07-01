import { useMemo } from 'react'
import { useAllKoPredictions } from '../../predicciones/hooks'
import { todayBogota } from '../../../lib/clock'
import { deriveColombiaTakeover, type ColombiaTakeover } from './colombiaTakeover'

// Estado del "Modo Colombia" del Inicio. Poll de 60s a las rondas KO para captar las transiciones
// scheduled→live→finished y el marcador en vivo; el mismo poll re-renderiza cerca de medianoche, así
// que `today` fresco (dep del memo) hace que el takeover se apague solo al rodar el día.
export function useColombiaTakeover(): ColombiaTakeover | null {
  const ko = useAllKoPredictions({ pollMs: 60_000 })
  const rounds = ko.rounds
  const today = todayBogota()
  return useMemo(() => deriveColombiaTakeover({ rounds, today }), [rounds, today])
}
