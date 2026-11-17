import { createHash } from 'node:crypto'

import { RESET_TOKEN_TTL_MINUTES, PASSWORD_RESET_PATH, RESET_TOKEN_PARAM } from './password-reset'
import { generateSessionToken, hashSessionToken, isSessionToken } from './session-token'

/**
 * The pure half of password reset tokens: generation, the stored form, expiry and the emailed
 * link. Tokens have the shape of session tokens (32 random bytes, base64url) and are stored the
 * same way, as their SHA-256, so a database read yields nothing that works as a link. No database
 * and no request context, so it is tested without mocks.
 */

export const RESET_TOKEN_TTL_MS = RESET_TOKEN_TTL_MINUTES * 60 * 1000

export function generateResetToken(): string {
  return generateSessionToken()
}

/** True for a value shaped like a token, so garbage is never hashed or looked up. */
export function isResetToken(value: unknown): value is string {
  return isSessionToken(value)
}

/** What `auth.password_reset_tokens.token_hash` stores. */
export function hashResetToken(token: string): string {
  return hashSessionToken(token)
}

export function resetTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MS)
}

/**
 * The link the email carries. `origin` must be the configured public origin of the site
 * (`NEXT_PUBLIC_APP_URL`), never the request's Host header, which a caller controls: a forged Host
 * would send the victim a working token on someone else's domain.
 */
export function resetLink(origin: URL | string, token: string): string {
  const url = new URL(PASSWORD_RESET_PATH, origin)
  url.searchParams.set(RESET_TOKEN_PARAM, token)
  return url.toString()
}

/**
 * Rate-limit key for an address: its SHA-256, so Redis never holds the address itself. The caller
 * passes the normalised (trimmed, lower-cased) address.
 */
export function emailRateLimitKey(email: string): string {
  return createHash('sha256').update(email).digest('base64url')
}
