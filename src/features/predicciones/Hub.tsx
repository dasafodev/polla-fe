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
