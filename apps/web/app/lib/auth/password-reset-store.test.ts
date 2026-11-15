import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const tx = {
    passwordResetToken: { updateMany: vi.fn(), findUnique: vi.fn() },
    user: { update: vi.fn() },
    session: { deleteMany: vi.fn() },
    auditEvent: { create: vi.fn() },
  }
  return {
    tx,
    userFindUnique: vi.fn(),
    tokenFindUnique: vi.fn(),
    tokenDeleteMany: vi.fn((args: unknown) => ({ op: 'deleteMany', args })),
    tokenCreate: vi.fn((args: unknown) => ({ op: 'create', args })),
    transaction: vi.fn(),
  }
})

vi.mock('@lasce/db', () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    passwordResetToken: {
      findUnique: mocks.tokenFindUnique,
      deleteMany: mocks.tokenDeleteMany,
      create: mocks.tokenCreate,
    },
    $transaction: mocks.transaction,
  },
}))

const { isPasswordResetTokenUsable, issuePasswordResetToken, resetPasswordWithToken } =
  await import('./password-reset-store')
const { generateResetToken, hashResetToken, isResetToken } = await import('./password-reset-token')

const now = new Date('2026-11-15T12:00:00.000Z')
const user = { id: 'user-1', fullName: 'Ana Pérez Rojas', email: 'ana@ucr.ac.cr' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.transaction.mockImplementation(async (work: unknown) =>
    typeof work === 'function' ? work(mocks.tx) : Promise.all(work as unknown[]),
  )
})

describe('issuePasswordResetToken', () => {
  test('writes nothing for an address without an account', async () => {
    mocks.userFindUnique.mockResolvedValue(null)

    expect(await issuePasswordResetToken('nadie@ucr.ac.cr', now)).toBeNull()
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.tokenCreate).not.toHaveBeenCalled()
  })

  test('looks the account up by its normalised address', async () => {
    mocks.userFindUnique.mockResolvedValue(null)
    await issuePasswordResetToken('  Ana@UCR.ac.cr ', now)
    expect(mocks.userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'ana@ucr.ac.cr' } }),
    )
  })

  test('voids older unused tokens and stores only the hash of a new one', async () => {
    mocks.userFindUnique.mockResolvedValue(user)

    const issued = await issuePasswordResetToken(user.email, now)

    expect(issued?.user).toEqual(user)
    expect(isResetToken(issued?.token)).toBe(true)
    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: user.id, usedAt: null },
    })
    expect(mocks.tokenCreate).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(issued?.token ?? ''),
        expiresAt: new Date('2026-11-15T12:30:00.000Z'),
      },
    })
    // Both writes go through one transaction, the deletion first.
    const [operations] = mocks.transaction.mock.calls[0] as [{ op: string }[]]
    expect(operations.map((operation) => operation.op)).toEqual(['deleteMany', 'create'])
  })
})

describe('isPasswordResetTokenUsable', () => {
  const token = generateResetToken()

  test('never queries for a value that is not token-shaped', async () => {
    expect(await isPasswordResetTokenUsable('nope', now)).toBe(false)
    expect(await isPasswordResetTokenUsable(undefined, now)).toBe(false)
    expect(mocks.tokenFindUnique).not.toHaveBeenCalled()
  })

  test('accepts an unused, unexpired token, looked up by its hash', async () => {
    mocks.tokenFindUnique.mockResolvedValue({
      expiresAt: new Date(now.getTime() + 1),
      usedAt: null,
    })

    expect(await isPasswordResetTokenUsable(token, now)).toBe(true)
    expect(mocks.tokenFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashResetToken(token) } }),
    )
  })

  test('rejects an unknown, used or expired token', async () => {
    mocks.tokenFindUnique.mockResolvedValueOnce(null)
    expect(await isPasswordResetTokenUsable(token, now)).toBe(false)

    mocks.tokenFindUnique.mockResolvedValueOnce({
      expiresAt: new Date(now.getTime() + 60_000),
      usedAt: new Date(now.getTime() - 1),
    })
    expect(await isPasswordResetTokenUsable(token, now)).toBe(false)

    mocks.tokenFindUnique.mockResolvedValueOnce({ expiresAt: now, usedAt: null })
    expect(await isPasswordResetTokenUsable(token, now)).toBe(false)
  })
})

describe('resetPasswordWithToken', () => {
  const token = generateResetToken()

  test('rejects a value that is not token-shaped without opening a transaction', async () => {
    expect(await resetPasswordWithToken('nope', 'hash', now)).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  test('changes nothing when the token is unknown, used or expired', async () => {
    mocks.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 })

    expect(await resetPasswordWithToken(token, 'hash', now)).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(mocks.tx.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashResetToken(token), usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    expect(mocks.tx.user.update).not.toHaveBeenCalled()
    expect(mocks.tx.session.deleteMany).not.toHaveBeenCalled()
    expect(mocks.tx.auditEvent.create).not.toHaveBeenCalled()
  })

  test('uses the token, stores the hash, ends every session and records the reset', async () => {
    mocks.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.passwordResetToken.findUnique.mockResolvedValue({
      user: { id: user.id, fullName: user.fullName },
    })

    expect(await resetPasswordWithToken(token, 'scrypt$hash', now)).toEqual({
      ok: true,
      userId: user.id,
    })
    expect(mocks.tx.user.update).toHaveBeenCalledWith({
      where: { id: user.id },
      data: { passwordHash: 'scrypt$hash', updatedAt: now },
    })
    expect(mocks.tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: user.id } })
    expect(mocks.tx.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'user.password_reset',
        summary: 'Contraseña restablecida: Ana Pérez Rojas',
        actorType: 'user',
        actorId: user.id,
        entityType: 'user',
        entityId: user.id,
      }),
    })
    const event = JSON.stringify(mocks.tx.auditEvent.create.mock.calls)
    expect(event).not.toContain('scrypt$hash')
    expect(event).not.toContain(token)
  })

  test('lets a failure inside the transaction propagate, so nothing is kept', async () => {
    mocks.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.passwordResetToken.findUnique.mockResolvedValue({
      user: { id: user.id, fullName: user.fullName },
    })
    mocks.tx.session.deleteMany.mockRejectedValueOnce(new Error('deadlock'))

    await expect(resetPasswordWithToken(token, 'hash', now)).rejects.toThrow('deadlock')
  })

  test('treats a token row that vanished after being claimed as invalid', async () => {
    mocks.tx.passwordResetToken.updateMany.mockResolvedValue({ count: 1 })
    mocks.tx.passwordResetToken.findUnique.mockResolvedValue(null)

    expect(await resetPasswordWithToken(token, 'hash', now)).toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(mocks.tx.user.update).not.toHaveBeenCalled()
  })
})
