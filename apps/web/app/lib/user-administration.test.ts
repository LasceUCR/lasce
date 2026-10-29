import { beforeEach, describe, expect, test, vi } from 'vitest'

const { findMany, findUnique, updateMany, userHasPermission, getSessionUser, auditCreate } =
  vi.hoisted(() => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    userHasPermission: vi.fn(),
    getSessionUser: vi.fn(),
    auditCreate: vi.fn(),
  }))
vi.mock('@lasce/db', () => {
  const tx = { user: { updateMany, findUnique }, auditEvent: { create: auditCreate } }
  return {
    UserRole: { VISITOR: 'VISITOR', ASSISTANT: 'ASSISTANT', ADMIN: 'ADMIN' },
    prisma: {
      user: { findMany, updateMany },
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    },
  }
})
vi.mock('./auth/authorization', () => ({ userHasPermission }))
vi.mock('./auth/session', () => ({ getSessionUser }))
import { availableRoles, getUserOverview, updateUserRole } from './user-administration'

const userId = 'ce0bcbba-04bd-4f14-b5d6-9c9db5f6ed74'
const actorId = '0a7d5a3e-5a0c-4a55-8a53-4f6b1c0f7a11'
beforeEach(() => {
  vi.resetAllMocks()
  userHasPermission.mockResolvedValue(true)
  getSessionUser.mockResolvedValue({ id: actorId, role: 'ADMIN' })
  findUnique.mockResolvedValue({ fullName: 'Ana' })
})

describe('user administration', () => {
  test('reads configured roles and maps profiles without exposing credentials', async () => {
    expect(availableRoles().map((role) => role.id)).toEqual(['VISITOR', 'ASSISTANT', 'ADMIN'])
    findMany.mockResolvedValue([
      {
        id: userId,
        fullName: 'Ana',
        email: 'ana@example.com',
        institution: 'UCR',
        countryCode: 'CR',
        role: null,
      },
    ])
    expect(await getUserOverview()).toEqual([
      {
        id: userId,
        name: 'Ana',
        email: 'ana@example.com',
        institution: 'UCR',
        country: 'Costa Rica',
        roleIds: [],
      },
    ])
    expect(findMany.mock.calls[0]![0].select).not.toHaveProperty('passwordHash')
    findMany.mockResolvedValue([
      {
        id: userId,
        fullName: 'Ana',
        email: 'ana@example.com',
        institution: 'UCR',
        countryCode: 'CR',
        role: 'VISITOR',
      },
    ])
    expect((await getUserOverview())[0]!.roleIds).toEqual(['VISITOR'])
  })
  test('denies reads and writes without the manage-users grant', async () => {
    userHasPermission.mockResolvedValue(false)
    await expect(getUserOverview()).rejects.toThrow('Unauthorized')
    expect(await updateUserRole({ userId, roleIds: ['ADMIN'], previousRoleIds: [] })).toEqual({
      ok: false,
      reason: 'unauthorized',
    })
    expect(findMany).not.toHaveBeenCalled()
    expect(updateMany).not.toHaveBeenCalled()
    expect(auditCreate).not.toHaveBeenCalled()
  })
  test.each([['ADMIN', 'VISITOR'], ['invented']])(
    'rejects invalid roles %j',
    async (...roleIds) => {
      expect(await updateUserRole({ userId, roleIds, previousRoleIds: [] })).toEqual({ ok: false })
      expect(updateMany).not.toHaveBeenCalled()
    },
  )
  test('saves and removes assignments using the previous value as a concurrency guard', async () => {
    updateMany.mockResolvedValue({ count: 1 })
    expect(
      await updateUserRole({ userId, roleIds: ['ASSISTANT'], previousRoleIds: ['VISITOR'] }),
    ).toEqual({ ok: true, roleIds: ['ASSISTANT'] })
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: userId, role: 'VISITOR' },
      data: { role: 'ASSISTANT' },
    })
    expect(await updateUserRole({ userId, roleIds: [], previousRoleIds: ['ASSISTANT'] })).toEqual({
      ok: true,
      roleIds: [],
    })
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: userId, role: 'ASSISTANT' },
      data: { role: null },
    })
  })
  test('records who changed which account from which role to which', async () => {
    updateMany.mockResolvedValue({ count: 1 })
    await updateUserRole({ userId, roleIds: ['ASSISTANT'], previousRoleIds: ['VISITOR'] })
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'user.role_change',
        summary: 'Rol de Ana cambiado de Visitante a Asistente',
        actorType: 'user',
        actorId,
        entityType: 'user',
        entityId: userId,
        metadata: { previousRole: 'VISITOR', newRole: 'ASSISTANT' },
      }),
    })
  })
  test('records a removed role as a change to no role', async () => {
    updateMany.mockResolvedValue({ count: 1 })
    await updateUserRole({ userId, roleIds: [], previousRoleIds: ['ASSISTANT'] })
    expect(auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        summary: 'Rol de Ana cambiado de Asistente a Sin rol',
        metadata: { previousRole: 'ASSISTANT', newRole: null },
      }),
    })
  })
  test('reports a stale assignment or deleted user instead of claiming success', async () => {
    updateMany.mockResolvedValue({ count: 0 })
    expect(await updateUserRole({ userId, roleIds: ['VISITOR'], previousRoleIds: [] })).toEqual({
      ok: false,
      reason: 'conflict',
    })
    expect(auditCreate).not.toHaveBeenCalled()
  })
})
