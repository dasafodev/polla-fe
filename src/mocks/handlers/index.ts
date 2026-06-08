import { authHandlers } from './auth'
import { groupsHandlers } from './groups'
import { powerupsHandlers } from './powerups'
import { koHandlers } from './ko'
import { scoreboardHandlers } from './scoreboard'

export const handlers = [...authHandlers, ...groupsHandlers, ...powerupsHandlers, ...koHandlers, ...scoreboardHandlers]
