import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/**
 * Password hashing for portal accounts, on Node's built-in scrypt so the web
 * app needs no native dependency.
 *
 * Hashes are stored as one self-describing string:
 *
 *     scrypt$<N>$<r>$<p>$<salt base64>$<hash base64>
 *
 * `verifyPassword` reads the parameters back from the string, so the cost can be
 * raised later without invalidating existing accounts, and a different KDF only
 * needs a new prefix. Login (LASCE-SEC-008-072) verifies against this format.
 */

export interface ScryptParams {
  /** CPU/memory cost. Must be a power of two greater than one. */
  N: number
  /** Block size. */
  r: number
  /** Parallelisation. */
  p: number
}

/**
 * One of the OWASP-listed scrypt configurations (N=2^15, r=8, p=3), equivalent
 * in work to N=2^17/r=8/p=1 at a quarter of the memory, which keeps a hash at
 * about 32 MiB and roughly 120 ms on current hardware.
 */
export const PASSWORD_HASH_PARAMS: Readonly<ScryptParams> = { N: 2 ** 15, r: 8, p: 3 }

const ALGORITHM = 'scrypt'
const SALT_LENGTH = 16
const KEY_LENGTH = 64
const SEGMENTS = 6

// Upper bounds for parameters read back from storage, so a corrupted or
// hostile string cannot make verification allocate gigabytes.
const MAX_N = 2 ** 20
const MAX_R = 32
const MAX_P = 16

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: ScryptParams,
): Promise<Buffer> {
  // Node throws when 128 * N * r reaches `maxmem` (32 MiB by default), which
  // N=2^15/r=8 does exactly, so the limit is derived from the parameters.
  const maxmem = 128 * params.N * params.r * 2

  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { ...params, maxmem }, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }
      resolve(derivedKey)
    })
  })
}

/**
 * Hashes with explicit parameters. Exported for tests that prove the stored
 * parameters are honoured; application code calls `hashPassword`.
 */
export async function hashPasswordWith(password: string, params: ScryptParams): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const hash = await deriveKey(password, salt, KEY_LENGTH, params)

  return [
    ALGORITHM,
    params.N,
    params.r,
    params.p,
    salt.toString('base64'),
    hash.toString('base64'),
  ].join('$')
}

export function hashPassword(password: string): Promise<string> {
  return hashPasswordWith(password, PASSWORD_HASH_PARAMS)
}

function parsePositiveInteger(value: string | undefined, max: number): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max ? parsed : null
}

function decodeBase64(value: string | undefined): Buffer | null {
  if (value === undefined || value.length === 0 || !/^[A-Za-z0-9+/]+=*$/.test(value)) return null
  const decoded = Buffer.from(value, 'base64')
  return decoded.length > 0 ? decoded : null
}

/**
 * Constant-time comparison of `password` against a string produced by
 * `hashPassword`. Returns `false`, never throws, for anything malformed.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const segments = stored.split('$')
  if (segments.length !== SEGMENTS || segments[0] !== ALGORITHM) return false

  const N = parsePositiveInteger(segments[1], MAX_N)
  const r = parsePositiveInteger(segments[2], MAX_R)
  const p = parsePositiveInteger(segments[3], MAX_P)
  const salt = decodeBase64(segments[4])
  const expected = decodeBase64(segments[5])
  if (N === null || r === null || p === null || salt === null || expected === null) return false

  try {
    const actual = await deriveKey(password, salt, expected.length, { N, r, p })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    // Invalid parameter combinations (N not a power of two, memory limit) are
    // reported by scrypt as errors; a stored string like that never matches.
    return false
  }
}
