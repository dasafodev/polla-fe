import { authHandlers } from './auth'
import { groupsHandlers } from './groups'
import { powerupsHandlers } from './powerups'

export const handlers = [...authHandlers, ...groupsHandlers, ...powerupsHandlers]
