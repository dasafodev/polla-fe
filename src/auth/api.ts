import { request } from '../lib/apiClient'
import type { ParticipantMe, LoginBody, SignupBody } from '../types/api'

export const getMe = () => request<ParticipantMe>('GET', '/me')
export const postLogin = (body: LoginBody) => request<ParticipantMe>('POST', '/auth/login', { body })
export const postSignup = (body: SignupBody) => request<ParticipantMe>('POST', '/auth/signup', { body })
export const postLogout = () => request<void>('POST', '/auth/logout', { body: {} })
