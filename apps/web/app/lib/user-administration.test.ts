import { beforeEach, describe, expect, test, vi } from 'vitest'

const { findMany, updateMany, getSessionUser } = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  getSessionUser: vi.fn(),
}))
vi.mock('@lasce/db', () => ({
  UserRole: { VISITOR: 'VISITOR', ASSISTANT: 'ASSISTANT', ADMIN: 'ADMIN' },
  prisma: { user: { findMany, updateMany } },
}))
vi.mock('./auth/session', () => ({ getSessionUser }))
import { availableRoles, getUserOverview, updateUserRole } from './user-administration'

const userId = 'ce0bcbba-04bd-4f14-b5d6-9c9db5f6ed74'
beforeEach(() => {
  vi.resetAllMocks()
  getSessionUser.mockResolvedValue({ id: 'actor', role: 'ADMIN' })
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
  test.each([null, { role: 'VISITOR' }, { role: 'ASSISTANT' }, { role: null }])(
    'denies reads and writes without an administrator session: %j',
    async (actor) => {
      getSessionUser.mockResolvedValue(actor)
      await expect(getUserOverview()).rejects.toThrow('Unauthorized')
      expect(await updateUserRole({ userId, roleIds: ['ADMIN'], previousRoleIds: [] })).toEqual({
        ok: false,
        reason: 'unauthorized',
      })
      expect(findMany).not.toHaveBeenCalled()
      expect(updateMany).not.toHaveBeenCalled()
    },
  )
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
  test('reports a stale assignment or deleted user instead of claiming success', async () => {
    updateMany.mockResolvedValue({ count: 0 })
    expect(await updateUserRole({ userId, roleIds: ['VISITOR'], previousRoleIds: [] })).toEqual({
      ok: false,
      reason: 'conflict',
    })
  })
})
