import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  ACCOUNT_COOKIE,
  ROLE_LABELS,
  canSeeAdminNavigation,
  clearAccountCookie,
  encodeAccountCookie,
  notifyAccountChanged,
  parseAccountCookieValue,
  readAccountCookie,
  readAccountName,
  shortName,
  subscribeAccount,
  writeAccountCookie,
} from './account'

describe('readAccountName', () => {
  test('returns null when the cookie is absent', () => {
    expect(readAccountName('')).toBeNull()
    expect(readAccountName('other=1; another=2')).toBeNull()
  })

  test('finds the cookie among others and decodes it once', () => {
    expect(readAccountName(`theme=dark; ${ACCOUNT_COOKIE}=Ana%20P%C3%A9rez; other=1`)).toBe(
      'Ana Pérez',
    )
    expect(readAccountName(`${ACCOUNT_COOKIE}=Ana`)).toBe('Ana')
  })

  test('treats an empty or undecodable value as signed out', () => {
    expect(readAccountName(`${ACCOUNT_COOKIE}=`)).toBeNull()
    expect(readAccountName(`${ACCOUNT_COOKIE}=%E0%A4%A`)).toBeNull()
  })

  test('does not confuse a cookie whose name merely starts the same', () => {
    expect(readAccountName(`${ACCOUNT_COOKIE}_other=Ana`)).toBeNull()
  })
})

describe('shortName', () => {
  test('keeps the first name only', () => {
    expect(shortName('Ana Pérez Rojas')).toBe('Ana')
    expect(shortName('  Ana  ')).toBe('Ana')
  })
})

describe('clearAccountCookie', () => {
  afterEach(() => {
    document.cookie = `${ACCOUNT_COOKIE}=; Max-Age=0; Path=/`
  })

  test('removes the cookie from the document', () => {
    document.cookie = `${ACCOUNT_COOKIE}=Ana; Path=/`
    expect(readAccountName(document.cookie)).toBe('Ana')

    clearAccountCookie()

    expect(readAccountName(document.cookie)).toBeNull()
  })

  test('writeAccountCookie puts the encoded name back, and nothing else', () => {
    writeAccountCookie({ name: 'Ana Pérez' })

    expect(document.cookie).toContain(
      `${ACCOUNT_COOKIE}=${encodeURIComponent(encodeAccountCookie({ name: 'Ana Pérez' }))}`,
    )
    expect(readAccountCookie(document.cookie)).toEqual({ name: 'Ana Pérez' })
    expect(readAccountName(document.cookie)).toBe('Ana Pérez')
  })
})

describe('subscribeAccount', () => {
  test('notifies subscribers until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeAccount(listener)

    notifyAccountChanged()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    notifyAccountChanged()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('ROLE_LABELS', () => {
  test('names the three roles in Spanish', () => {
    expect(Object.keys(ROLE_LABELS).sort()).toEqual(['ADMIN', 'ASSISTANT', 'VISITOR'])
    expect(ROLE_LABELS.VISITOR).toBe('Visitante')
  })
})

describe('account cookie payload', () => {
  test('round-trips the display name only (LASCE-SEC-001)', () => {
    const encoded = encodeAccountCookie({ name: 'Ana Pérez' })

    expect(JSON.parse(encoded)).toEqual({ name: 'Ana Pérez' })
    expect(parseAccountCookieValue(encoded)).toEqual({ name: 'Ana Pérez' })
  })

  test('reads a legacy name-only cookie', () => {
    expect(parseAccountCookieValue('Ana Pérez')).toEqual({ name: 'Ana Pérez' })
    expect(readAccountCookie(`${ACCOUNT_COOKIE}=Ana%20P%C3%A9rez`)).toEqual({ name: 'Ana Pérez' })
  })

  test('drops a role left by an older login or forged by hand', () => {
    for (const role of ['ADMIN', 'ASSISTANT', 'OWNER']) {
      expect(parseAccountCookieValue(JSON.stringify({ name: 'Ana', role }))).toEqual({
        name: 'Ana',
      })
    }
  })
})

describe('canSeeAdminNavigation', () => {
  test('is true only for assistants and administrators', () => {
    expect(canSeeAdminNavigation('ASSISTANT')).toBe(true)
    expect(canSeeAdminNavigation('ADMIN')).toBe(true)
    expect(canSeeAdminNavigation('VISITOR')).toBe(false)
    expect(canSeeAdminNavigation(null)).toBe(false)
    expect(canSeeAdminNavigation(undefined)).toBe(false)
  })
})
