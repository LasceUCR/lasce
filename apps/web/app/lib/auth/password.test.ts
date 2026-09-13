import { describe, expect, test } from 'vitest'

import { PASSWORD_HASH_PARAMS, hashPassword, hashPasswordWith, verifyPassword } from './password'

// Cheap parameters for the tests that only care about format and agility; the
// production parameters are exercised once so their cost stays visible.
const fastParams = { N: 2 ** 4, r: 8, p: 1 }

describe('hashPassword', () => {
  test('produces a self-describing scrypt string with the production parameters', async () => {
    const stored = await hashPassword('correct horse battery staple')
    const [algorithm, N, r, p, salt, hash] = stored.split('$')

    expect(algorithm).toBe('scrypt')
    expect(Number(N)).toBe(PASSWORD_HASH_PARAMS.N)
    expect(Number(r)).toBe(PASSWORD_HASH_PARAMS.r)
    expect(Number(p)).toBe(PASSWORD_HASH_PARAMS.p)
    expect(Buffer.from(salt ?? '', 'base64')).toHaveLength(16)
    expect(Buffer.from(hash ?? '', 'base64')).toHaveLength(64)
  })

  test('salts every hash, so the same password never hashes twice to the same string', async () => {
    const first = await hashPasswordWith('same password', fastParams)
    const second = await hashPasswordWith('same password', fastParams)

    expect(first).not.toBe(second)
    expect(await verifyPassword('same password', first)).toBe(true)
    expect(await verifyPassword('same password', second)).toBe(true)
  })
})

describe('verifyPassword', () => {
  test('accepts the password the string was made from', async () => {
    const stored = await hashPasswordWith('contraseña segura', fastParams)

    expect(await verifyPassword('contraseña segura', stored)).toBe(true)
  })

  test('rejects a different password', async () => {
    const stored = await hashPasswordWith('contraseña segura', fastParams)

    expect(await verifyPassword('contraseña insegura', stored)).toBe(false)
    expect(await verifyPassword('', stored)).toBe(false)
  })

  test('honours the parameters embedded in the string rather than the current defaults', async () => {
    const stored = await hashPasswordWith('agile', { N: 2 ** 5, r: 4, p: 2 })

    expect(stored.startsWith('scrypt$32$4$2$')).toBe(true)
    expect(await verifyPassword('agile', stored)).toBe(true)
  })

  test('rejects a tampered hash or altered parameters', async () => {
    const stored = await hashPasswordWith('agile', fastParams)
    const segments = stored.split('$')
    const hash = segments[5] ?? ''
    const flipped = (hash[0] === 'A' ? 'B' : 'A') + hash.slice(1)

    expect(await verifyPassword('agile', [...segments.slice(0, 5), flipped].join('$'))).toBe(false)
    expect(await verifyPassword('agile', stored.replace('scrypt$16$', 'scrypt$32$'))).toBe(false)
  })

  test('returns false instead of throwing for malformed input', async () => {
    const stored = await hashPasswordWith('agile', fastParams)
    const [, N, r, p, salt, hash] = stored.split('$')

    const malformed = [
      '',
      'not a hash',
      `bcrypt$${N}$${r}$${p}$${salt}$${hash}`,
      `scrypt$${N}$${r}$${p}$${salt}`,
      `scrypt$abc$${r}$${p}$${salt}$${hash}`,
      `scrypt$${N}$${r}$${p}$$${hash}`,
      `scrypt$${N}$${r}$${p}$${salt}$***`,
      `scrypt$15$${r}$${p}$${salt}$${hash}`,
      `scrypt$${2 ** 30}$${r}$${p}$${salt}$${hash}`,
    ]

    for (const value of malformed) {
      expect(await verifyPassword('agile', value)).toBe(false)
    }
  })
})
