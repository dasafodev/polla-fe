import type { ErrorCode } from '../types/enums'

export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

export function isCode(e: unknown, code: ErrorCode): boolean {
  return isApiError(e) && e.code === code
}
