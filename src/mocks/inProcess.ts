import { setupServer } from 'msw/native'
import { handlers } from './handlers'
import { devHandlers } from './devApi'
import './seed' // efecto secundario: siembra el db en memoria al cargar el módulo (browser).

// Mismo criterio que el server de tests: en dev incluimos el dev-bypass; en build solo handlers reales.
const all = import.meta.env.DEV ? [...handlers, ...devHandlers] : handlers

// Interceptación de fetch EN PROCESO (sin Service Worker). setupServer de msw/native parchea
// globalThis.fetch al llamar a network.listen(), de forma síncrona y en la misma página. Así NO
// existe la ventana de "documento aún sin controlar por el SW" que hacía que el POST de login
// escapara a nginx en la primera carga de iOS Safari (daba "Respuesta inválida del servidor").
export const network = setupServer(...all)
