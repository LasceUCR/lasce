import { createHash, randomBytes } from 'node:crypto'

/**
 * The pure half of session handling: tokens, their storage form, cookie
 * attributes and the return-path rules. No database, no request context, so
 * every function here is unit-tested without mocks. `session.ts` is the half
 * that touches Prisma and `cookies()`.
 */

/** HttpOnly cookie that authenticates; holds the raw token. */
export const SESSION_COOKIE = 'lasce_session'
/** Absolute lifetime of a session, from login. There is no sliding renewal. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const LOGIN_PATH = '/login'
export const DEFAULT_RETURN_PATH = '/cuenta'

export interface SessionCookieOptions {
  httpOnly: boolean
  sameSite: 'lax'
  secure: boolean
  path: '/'
  expires: Date
}

const TOKEN_BYTES = 32
// 32 bytes in base64url are always 43 characters of this alphabet.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/** True for a value shaped like our tokens, so garbage is never hashed or looked up. */
export function isSessionToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value)
}

/** What the database stores: the SHA-256 of the token, base64url. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

export function sessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_MS)
}

function cookieOptions(expires: Date, httpOnly: boolean): SessionCookieOptions {
  return {
    httpOnly,
    sameSite: 'lax',
    // Read at call time rather than module load so tests can stub the environment.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  }
}

export function sessionCookieOptions(expires: Date): SessionCookieOptions {
  return cookieOptions(expires, true)
}

/** Same attributes as the session cookie, minus HttpOnly, for the display-name cookie. */
export function accountCookieOptions(expires: Date): SessionCookieOptions {
  return cookieOptions(expires, false)
}

const MAX_RETURN_PATH_LENGTH = 2048
// One leading slash, not followed by another slash or a backslash (which
// browsers may read as a protocol-relative URL), then printable ASCII only.
const RETURN_PATH_PATTERN = /^\/(?![/\\])[!-~]*$/

/**
 * Validates a `next` parameter or hidden input so login can only ever send the
 * browser to a path on this site. Anything else, including the login page
 * itself, falls back to the account page.
 */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length > MAX_RETURN_PATH_LENGTH) {
    return DEFAULT_RETURN_PATH
  }
  if (!RETURN_PATH_PATTERN.test(value)) return DEFAULT_RETURN_PATH
  if (
    value === LOGIN_PATH ||
    value.startsWith(`${LOGIN_PATH}?`) ||
    value.startsWith(`${LOGIN_PATH}/`)
  ) {
    return DEFAULT_RETURN_PATH
  }
  return value
}

/** Where an anonymous visitor is sent from a protected page. */
export function loginRedirectPath(returnTo: string): string {
  return `${LOGIN_PATH}?${new URLSearchParams({ next: returnTo, reason: 'auth' })}`
}
