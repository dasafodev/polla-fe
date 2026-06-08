import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import './seed' // efecto secundario: siembra el db en memoria al cargar (browser). En tests lo hace resetDb().

export const worker = setupWorker(...handlers)
