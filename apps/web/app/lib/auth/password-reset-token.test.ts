import { createHash } from 'node:crypto'

import { describe, expect, test } from 'vitest'

import {
  RESET_TOKEN_TTL_MS,
  emailRateLimitKey,
  generateResetToken,
  hashResetToken,
  isResetToken,
  resetLink,
  resetTokenExpiry,
} from './password-reset-token'

describe('password reset tokens', () => {
  test('generates distinct 256-bit base64url tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, generateResetToken))
    expect(tokens.size).toBe(50)
    for (const token of tokens) {
      expect(isResetToken(token)).toBe(true)
      expect(Buffer.from(token, 'base64url')).toHaveLength(32)
    }
  })

  test('recognises only token-shaped values', () => {
    expect(isResetToken('a'.repeat(43))).toBe(true)
    for (const value of ['', 'a'.repeat(42), 'a'.repeat(44), `${'a'.repeat(42)}=`, null, 42]) {
      expect(isResetToken(value)).toBe(false)
    }
  })

  test('stores the base64url SHA-256 of the token, never the token', () => {
    const token = generateResetToken()
    const hash = hashResetToken(token)
    expect(hash).toBe(createHash('sha256').update(token).digest('base64url'))
    expect(hash).not.toContain(token)
  })

  test('expires 30 minutes after it is issued', () => {
    const now = new Date('2026-11-15T12:00:00.000Z')
    expect(RESET_TOKEN_TTL_MS).toBe(30 * 60 * 1000)
    expect(resetTokenExpiry(now).toISOString()).toBe('2026-11-15T12:30:00.000Z')
  })

  test('builds the link on the configured origin, whatever path it has', () => {
    const token = generateResetToken()
    expect(resetLink(new URL('https://lasce.ucr.ac.cr/'), token)).toBe(
      `https://lasce.ucr.ac.cr/restablecer-contrasena?token=${token}`,
    )
    expect(resetLink('http://localhost:3000/acceso', token)).toBe(
      `http://localhost:3000/restablecer-contrasena?token=${token}`,
    )
  })

  test('keys rate limits on a hash of the address', () => {
    const key = emailRateLimitKey('ana@ucr.ac.cr')
    expect(key).toBe(emailRateLimitKey('ana@ucr.ac.cr'))
    expect(key).not.toContain('ana')
    expect(key).not.toBe(emailRateLimitKey('otra@ucr.ac.cr'))
  })
})
