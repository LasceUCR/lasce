import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  ACCOUNT_COOKIE,
  ROLE_LABELS,
  accountMenuCopy,
  clearAccountCookie,
  notifyAccountChanged,
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
    expect(accountMenuCopy.greeting('Ana Pérez Rojas')).toBe('Hola, Ana')
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

  test('writeAccountCookie puts an encoded name back', () => {
    writeAccountCookie('Ana Pérez')

    expect(document.cookie).toContain(`${ACCOUNT_COOKIE}=Ana%20P%C3%A9rez`)
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
