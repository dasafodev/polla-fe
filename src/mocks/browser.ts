import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { devHandlers } from './devApi'
import './seed' // efecto secundario: siembra el db en memoria al cargar (browser). En tests lo hace resetDb().

// El dev-bypass solo se monta en desarrollo (import.meta.env.DEV es false en cualquier build).
const all = import.meta.env.DEV ? [...handlers, ...devHandlers] : handlers

export const worker = setupWorker(...all)
