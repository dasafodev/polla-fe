import { setupServer } from 'msw/node'
import { handlers } from './handlers'
import { devHandlers } from './devApi'

// Los tests corren en modo dev: incluimos los handlers de dev-bypass para poder ejercitarlos.
export const server = setupServer(...handlers, ...devHandlers)
