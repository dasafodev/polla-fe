import { authHandlers } from './auth'
import { groupsHandlers } from './groups'
import { powerupsHandlers } from './powerups'
import { koHandlers } from './ko'
import { scoreboardHandlers } from './scoreboard'
import { adminHandlers } from './admin'

export const handlers = [...authHandlers, ...groupsHandlers, ...powerupsHandlers, ...koHandlers, ...scoreboardHandlers, ...adminHandlers]
