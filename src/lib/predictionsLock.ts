import { now } from './clock'
import { env } from './env'

// Fecha de cierre de pronósticos (grupos, terceros y pálpitos). Ver env.predictionsLockAt.
export const PREDICTIONS_CLOSE_AT = env.predictionsLockAt

// Solo lectura cuando el API ya reporta el candado (available) o cuando ya pasó el cierre por fecha.
// El piso por fecha existe porque el backend no expone la bandera sin partidos cargados.
export function predictionsLocked(apiAvailable: boolean | undefined): boolean {
  return apiAvailable === true || now() >= Date.parse(PREDICTIONS_CLOSE_AT)
}
