import { describe, it, expect } from 'vitest'
import { roundToBackend, roundToFrontend, statusToFrontend, roleToFrontend } from './contract'

describe('roundToBackend (FE slug → backend Prisma enum)', () => {
  it('uppercases the simple slugs', () => {
    expect(roundToBackend('r32')).toBe('R32')
    expect(roundToBackend('r16')).toBe('R16')
    expect(roundToBackend('qf')).toBe('QF')
    expect(roundToBackend('sf')).toBe('SF')
    expect(roundToBackend('final')).toBe('FINAL')
  })
  it('maps the third-place slug 3rd → THIRD', () => {
    expect(roundToBackend('3rd')).toBe('THIRD')
  })
})

describe('roundToFrontend (backend enum → FE slug)', () => {
  it('lowercases the simple values', () => {
    expect(roundToFrontend('R32')).toBe('r32')
    expect(roundToFrontend('R16')).toBe('r16')
    expect(roundToFrontend('QF')).toBe('qf')
    expect(roundToFrontend('SF')).toBe('sf')
    expect(roundToFrontend('FINAL')).toBe('final')
  })
  it('maps THIRD → 3rd', () => {
    expect(roundToFrontend('THIRD')).toBe('3rd')
  })
  it('is idempotent if already a FE slug', () => {
    expect(roundToFrontend('r32')).toBe('r32')
    expect(roundToFrontend('3rd')).toBe('3rd')
  })
})

describe('statusToFrontend (backend MatchStatus → FE)', () => {
  it('lowercases the status', () => {
    expect(statusToFrontend('SCHEDULED')).toBe('scheduled')
    expect(statusToFrontend('LIVE')).toBe('live')
    expect(statusToFrontend('FINISHED')).toBe('finished')
  })
  it('is idempotent', () => {
    expect(statusToFrontend('scheduled')).toBe('scheduled')
  })
})

describe('roleToFrontend (backend ParticipantRole → FE)', () => {
  it('lowercases the role', () => {
    expect(roleToFrontend('PARTICIPANT')).toBe('participant')
    expect(roleToFrontend('ADMIN')).toBe('admin')
  })
  it('is idempotent', () => {
    expect(roleToFrontend('admin')).toBe('admin')
  })
})
