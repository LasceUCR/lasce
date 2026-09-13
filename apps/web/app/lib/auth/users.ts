import { prisma } from '@lasce/db'
import type { UserRole } from '@lasce/db'

import DuplicateEmailError from './errors/DuplicateEmailError'

/**
 * Everything the registration form is allowed to decide about a new account.
 * There is no `role` on purpose: the database default (`visitor`) is the only
 * way a self-registered account gets one.
 */
export interface NewUser {
  fullName: string
  /** Already trimmed and lower-cased by the registration schema. */
  email: string
  institution: string
  /** ISO 3166-1 alpha-2, validated against `COUNTRY_CODES`. */
  countryCode: string
  /** Output of `hashPassword`, never the plain password. */
  passwordHash: string
}

export interface CreatedUser {
  id: string
  role: UserRole
}

/**
 * Prisma reports a unique-constraint failure as a `PrismaClientKnownRequestError`
 * with `code` "P2002". Matching on the code rather than the class keeps this
 * module testable with a plain object mock of `@lasce/db`, and the code, unlike
 * the class path, is the part of Prisma's contract that has stayed stable.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

/**
 * Inserts a portal account. Throws `DuplicateEmailError` when the email is
 * already registered and lets every other failure propagate.
 */
export async function createUser(user: NewUser): Promise<CreatedUser> {
  // Picked field by field rather than spread, so nothing a caller happens to
  // carry along (a role, an id) can reach the insert.
  const data = {
    fullName: user.fullName,
    email: user.email,
    institution: user.institution,
    countryCode: user.countryCode,
    passwordHash: user.passwordHash,
  }

  try {
    return await prisma.user.create({ data, select: { id: true, role: true } })
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new DuplicateEmailError()
    }
    throw error
  }
}
