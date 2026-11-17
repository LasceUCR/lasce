import { describe, expect, test } from 'vitest'

import {
  SMTP_KEY_CONTEXT,
  SecretDecryptionError,
  decryptSecret,
  deriveKey,
  encryptSecret,
} from '@/app/services/mail/crypto'

const key = deriveKey('un-secreto-de-cron-de-prueba')

// The first character, because the last one of a base64url string can be padding bits only.
function flipFirstCharacter(part: string): string {
  const first = part.startsWith('A') ? 'B' : 'A'
  return `${first}${part.slice(1)}`
}

describe('deriveKey', () => {
  test('derives the same 256-bit key from the same secret and context', () => {
    expect(key).toHaveLength(32)
    expect(deriveKey('un-secreto-de-cron-de-prueba').equals(key)).toBe(true)
  })

  test('derives unrelated keys from another secret or another context', () => {
    expect(deriveKey('otro-secreto-de-cron').equals(key)).toBe(false)
    expect(deriveKey('un-secreto-de-cron-de-prueba', `${SMTP_KEY_CONTEXT}-x`).equals(key)).toBe(
      false,
    )
  })

  test('refuses an empty secret', () => {
    expect(() => deriveKey('')).toThrow()
  })
})

describe('encryptSecret and decryptSecret', () => {
  test('round-trips a password, spaces and accents included', () => {
    const password = ' contraseña SMTP ñ '
    expect(decryptSecret(encryptSecret(password, key), key)).toBe(password)
  })

  test('writes a versioned payload that never contains the plain text', () => {
    const payload = encryptSecret('secreto-visible', key)
    expect(payload).toMatch(/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]+$/)
    expect(payload).not.toContain('secreto-visible')
  })

  test('uses a fresh IV for every write', () => {
    expect(encryptSecret('igual', key)).not.toBe(encryptSecret('igual', key))
  })

  test('rejects a payload under another key', () => {
    const payload = encryptSecret('secreto', key)
    expect(() => decryptSecret(payload, deriveKey('rotado-rotado'))).toThrow(SecretDecryptionError)
  })

  test('detects tampering with the ciphertext, the tag or the IV', () => {
    const [version, iv = '', tag = '', ciphertext = ''] = encryptSecret('secreto', key).split('.')
    for (const tampered of [
      [version, iv, tag, flipFirstCharacter(ciphertext)],
      [version, iv, flipFirstCharacter(tag), ciphertext],
      [version, flipFirstCharacter(iv), tag, ciphertext],
    ]) {
      expect(() => decryptSecret(tampered.join('.'), key)).toThrow(SecretDecryptionError)
    }
  })

  test('rejects malformed payloads and unknown versions', () => {
    const [, iv, tag, ciphertext] = encryptSecret('secreto', key).split('.')
    for (const payload of [
      '',
      'v1.abc',
      `v2.${iv}.${tag}.${ciphertext}`,
      `v1.${iv}.${tag}.${ciphertext}.extra`,
      `v1.${iv}.${tag}.no+base64url`,
      `v1.AAAA.${tag}.${ciphertext}`,
    ]) {
      expect(() => decryptSecret(payload, key)).toThrow(SecretDecryptionError)
    }
  })
})
