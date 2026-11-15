import { prisma } from '@lasce/db'

import { recordUserAuditEvent } from '../audit-log'
import {
  generateResetToken,
  hashResetToken,
  isResetToken,
  resetTokenExpiry,
} from './password-reset-token'

/**
 * Password reset tokens in `auth.password_reset_tokens` (LASCE-CON-0012-448). Only the token's
 * hash is stored. A token works once, for 30 minutes, and a successful reset also revokes every
 * session of the account. Server-only.
 */

/** The account a reset email goes to. */
export interface ResetRecipient {
  id: string
  fullName: string
  email: string
}

export interface IssuedResetToken {
  token: string
  user: ResetRecipient
}

/**
 * Issues a token for the account behind `email`, or returns `null` when there is none, in which
 * case nothing is written. The account's earlier unused tokens are deleted in the same
 * transaction, so only the newest link works.
 */
export async function issuePasswordResetToken(
  email: string,
  now: Date = new Date(),
): Promise<IssuedResetToken | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, fullName: true, email: true },
  })
  if (!user) return null

  const token = generateResetToken()
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt: resetTokenExpiry(now) },
    }),
  ])
  return { token, user }
}

/** Whether `token` can still reset a password: it exists, is unused and has not expired. */
export async function isPasswordResetTokenUsable(
  token: unknown,
  now: Date = new Date(),
): Promise<boolean> {
  if (!isResetToken(token)) return false
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { expiresAt: true, usedAt: true },
  })
  return row !== null && row.usedAt === null && row.expiresAt.getTime() > now.getTime()
}

export type ResetPasswordResult = { ok: true; userId: string } | { ok: false; reason: 'invalid' }

/**
 * Sets the account's password from a token, in one transaction:
 *
 * 1. marks the token used, only if it is still unused and unexpired (a compare-and-set, so two
 *    simultaneous submissions of the same link cannot both succeed);
 * 2. stores `passwordHash` (already produced by `hashPassword`);
 * 3. deletes every session of the account, so whoever was signed in has to sign in again;
 * 4. records `user.password_reset` in the audit trail.
 *
 * Any failure rolls all of it back. An unknown, used or expired token changes nothing.
 */
export async function resetPasswordWithToken(
  token: unknown,
  passwordHash: string,
  now: Date = new Date(),
): Promise<ResetPasswordResult> {
  if (!isResetToken(token)) return { ok: false, reason: 'invalid' }
  const tokenHash = hashResetToken(token)

  return prisma.$transaction(async (tx): Promise<ResetPasswordResult> => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    if (claimed.count !== 1) return { ok: false, reason: 'invalid' }

    const row = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { user: { select: { id: true, fullName: true } } },
    })
    if (!row) return { ok: false, reason: 'invalid' }
    const { user } = row

    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, updatedAt: now },
    })
    await tx.session.deleteMany({ where: { userId: user.id } })
    await recordUserAuditEvent(tx, user, {
      action: 'user.password_reset',
      summary: `Contraseña restablecida: ${user.fullName}`,
      entityType: 'user',
      entityId: user.id,
    })
    return { ok: true, userId: user.id }
  })
}
