import { authHandlers } from './auth'
import { groupsHandlers } from './groups'

export const handlers = [...authHandlers, ...groupsHandlers]
