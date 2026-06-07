import type { Role } from './enums'

// schema ParticipantMe — FORMA NUEVA (§5.1): sin hasJoined/hasPhone
export interface ParticipantMe {
  id: string
  name: string
  email: string
  role: Role
}

// schema ErrorResponse
export interface ErrorResponse {
  error: string
  code: string
}

// schema HealthResponse
export interface HealthResponse {
  status: string
  db: string
  timestamp: string
}

// schema Invitation
export interface Invitation {
  id: string
  code: string
  status: 'available' | 'used'
  usedAt: string | null
  expiresAt: string
  createdAt: string
}

// Bodies de auth (modelo nuevo §7)
export interface LoginBody {
  credential: string
}
export interface SignupBody {
  credential: string
  code: string
  phone: string
}
