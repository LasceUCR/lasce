import { createHash } from 'node:crypto'

import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  DEFAULT_RETURN_PATH,
  SESSION_TTL_MS,
  accountCookieOptions,
  generateSessionToken,
  hashSessionToken,
  isSessionToken,
  loginRedirectPath,
  safeReturnPath,
  sessionCookieOptions,
  sessionExpiry,
} from './session-token'

describe('generateSessionToken', () => {
  test('produces 43 base64url characters, different every time', () => {
    const first = generateSessionToken()
    const second = generateSessionToken()

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(first).not.toBe(second)
    expect(isSessionToken(first)).toBe(true)
  })
})

describe('isSessionToken', () => {
  test('rejects anything that is not shaped like our tokens', () => {
    expect(isSessionToken('')).toBe(false)
    expect(isSessionToken('short')).toBe(false)
    expect(isSessionToken(`${'a'.repeat(42)}=`)).toBe(false)
    expect(isSessionToken('a'.repeat(44))).toBe(false)
    expect(isSessionToken(undefined)).toBe(false)
    expect(isSessionToken(42)).toBe(false)
  })
})

describe('hashSessionToken', () => {
  test('is a deterministic base64url SHA-256 that differs between tokens', () => {
    const token = generateSessionToken()

    expect(hashSessionToken(token)).toBe(hashSessionToken(token))
    expect(hashSessionToken(token)).toBe(createHash('sha256').update(token).digest('base64url'))
    expect(hashSessionToken(token)).not.toBe(hashSessionToken(generateSessionToken()))
    expect(hashSessionToken(token)).not.toBe(token)
  })
})

describe('sessionExpiry', () => {
  test('is thirty days after the given moment', () => {
    const now = new Date('2026-09-13T12:00:00.000Z')

    expect(sessionExpiry(now).toISOString()).toBe('2026-10-13T12:00:00.000Z')
    expect(SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })
})

describe('cookie options', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('the session cookie is HttpOnly, Lax and site-wide, and Secure only in production', () => {
    const expires = new Date('2026-10-13T12:00:00.000Z')

    expect(sessionCookieOptions(expires)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      expires,
    })

    vi.stubEnv('NODE_ENV', 'production')
    expect(sessionCookieOptions(expires).secure).toBe(true)
  })

  test('the account cookie differs only in being readable by scripts', () => {
    const expires = new Date('2026-10-13T12:00:00.000Z')

    expect(accountCookieOptions(expires)).toEqual({
      ...sessionCookieOptions(expires),
      httpOnly: false,
    })
  })
})

describe('safeReturnPath', () => {
  test('accepts a path on this site', () => {
    expect(safeReturnPath('/cuenta')).toBe('/cuenta')
    expect(safeReturnPath('/datos?x=1&y=2')).toBe('/datos?x=1&y=2')
    expect(safeReturnPath('/administracion/usuarios')).toBe('/administracion/usuarios')
  })

  test('falls back to the account page for anything that could leave the site', () => {
    for (const value of [
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      'cuenta',
      '/a\nb',
      '/con espacios',
      '',
      undefined,
      null,
      ['/cuenta'],
      `/${'a'.repeat(3000)}`,
    ]) {
      expect(safeReturnPath(value)).toBe(DEFAULT_RETURN_PATH)
    }
  })

  test('never sends the browser back to the login page', () => {
    expect(safeReturnPath('/login')).toBe(DEFAULT_RETURN_PATH)
    expect(safeReturnPath('/login?next=%2Fcuenta')).toBe(DEFAULT_RETURN_PATH)
    expect(safeReturnPath('/login/')).toBe(DEFAULT_RETURN_PATH)
    expect(safeReturnPath('/loginextra')).toBe('/loginextra')
  })
})

describe('loginRedirectPath', () => {
  test('encodes the return path and marks the reason', () => {
    expect(loginRedirectPath('/cuenta')).toBe('/login?next=%2Fcuenta&reason=auth')
    expect(loginRedirectPath('/datos?x=1')).toBe('/login?next=%2Fdatos%3Fx%3D1&reason=auth')
  })
})
