import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto'

/**
 * Encryption for the one secret the portal keeps in its database: the SMTP password in
 * `public.smtp_settings`. AES-256-GCM with a random 96-bit IV per write, stored as
 *
 *   v1.<iv>.<auth tag>.<ciphertext>      (each part base64url)
 *
 * The version prefix lets the format change later without guessing; it is also bound to the
 * ciphertext as additional authenticated data, so a payload cannot be relabelled.
 *
 * The key is not a variable of its own: it is derived from `CRON_SECRET` with HKDF-SHA256 and a
 * fixed context label, so rotating `CRON_SECRET` makes the stored password unreadable and an
 * administrator has to enter it again (`docs/password-reset.md`).
 */

export const SECRET_FORMAT_VERSION = 'v1'
/** HKDF `info`: a different label yields an unrelated key from the same secret. */
export const SMTP_KEY_CONTEXT = 'lasce/smtp-settings/v1'

const KEY_BYTES = 32
const IV_BYTES = 12
const TAG_BYTES = 16
const ALGORITHM = 'aes-256-gcm'

/** Thrown for any payload that cannot be decrypted: malformed, tampered with, or another key. */
export class SecretDecryptionError extends Error {
  constructor() {
    super('The stored secret cannot be decrypted with the current key.')
    this.name = 'SecretDecryptionError'
  }
}

/** A 256-bit key from `secret`, specific to `context`. */
export function deriveKey(secret: string, context: string = SMTP_KEY_CONTEXT): Buffer {
  if (secret === '') throw new Error('Cannot derive a key from an empty secret.')
  return Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), context, KEY_BYTES))
}

export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES })
  cipher.setAAD(Buffer.from(SECRET_FORMAT_VERSION))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [SECRET_FORMAT_VERSION, iv, tag, ciphertext]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.')
}

const PART_PATTERN = /^[A-Za-z0-9_-]*$/

export function decryptSecret(payload: string, key: Buffer): string {
  const parts = payload.split('.')
  if (parts.length !== 4) throw new SecretDecryptionError()
  const [version, ivPart = '', tagPart = '', ciphertextPart = ''] = parts
  if (version !== SECRET_FORMAT_VERSION) throw new SecretDecryptionError()
  if (![ivPart, tagPart, ciphertextPart].every((part) => PART_PATTERN.test(part))) {
    throw new SecretDecryptionError()
  }

  const iv = Buffer.from(ivPart, 'base64url')
  const tag = Buffer.from(tagPart, 'base64url')
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new SecretDecryptionError()

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES })
    decipher.setAAD(Buffer.from(SECRET_FORMAT_VERSION))
    decipher.setAuthTag(tag)
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new SecretDecryptionError()
  }
}
