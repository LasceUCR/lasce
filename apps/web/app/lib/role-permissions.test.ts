import { beforeEach, describe, expect, test, vi } from 'vitest'

const { findMany, deleteMany, createMany, transaction, getSessionUser, getPermissionsForRole } =
  vi.hoisted(() => ({
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    transaction: vi.fn(),
    getSessionUser: vi.fn(),
    getPermissionsForRole: vi.fn(),
  }))

vi.mock('@lasce/db', () => ({
  UserRole: { VISITOR: 'VISITOR', ASSISTANT: 'ASSISTANT', ADMIN: 'ADMIN' },
  prisma: {
    rolePermission: { findMany, deleteMany, createMany },
    $transaction: transaction,
  },
}))

vi.mock('./auth/session', () => ({ getSessionUser }))
vi.mock('./auth/permission-store', () => ({ getPermissionsForRole }))

import { getPermissionMatrix, updateRolePermissions } from './role-permissions'

beforeEach(() => {
  vi.resetAllMocks()
  getSessionUser.mockResolvedValue({ id: 'actor', role: 'ADMIN' })
  getPermissionsForRole.mockResolvedValue(new Set(['manage_permissions']))
  transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({ rolePermission: { findMany, deleteMany, createMany } }),
  )
})

describe('role permission matrix', () => {
  test('groups stored rows by role and drops unknown permission strings', async () => {
    findMany.mockResolvedValue([
      { role: 'VISITOR', permission: 'download_resources' },
      { role: 'ASSISTANT', permission: 'edit_components' },
      { role: 'ASSISTANT', permission: 'invented' },
      { role: 'ADMIN', permission: 'manage_users' },
      { role: 'ADMIN', permission: 'create_components' },
    ])
    expect(await getPermissionMatrix()).toEqual({
      VISITOR: ['download_resources'],
      ASSISTANT: ['edit_components'],
      ADMIN: ['create_components', 'manage_users'],
    })
  })

  test('denies reads and writes without the manage-permissions grant', async () => {
    getPermissionsForRole.mockResolvedValue(new Set())
    await expect(getPermissionMatrix()).rejects.toThrow('Unauthorized')
    expect(
      await updateRolePermissions({
        role: 'VISITOR',
        permissions: ['download_resources'],
        previousPermissions: [],
      }),
    ).toEqual({ ok: false, reason: 'unauthorized' })
    expect(findMany).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
  })

  test('rejects unknown roles or permissions without writing', async () => {
    expect(
      await updateRolePermissions({
        role: 'OWNER',
        permissions: ['download_resources'],
        previousPermissions: [],
      }),
    ).toEqual({ ok: false })
    expect(
      await updateRolePermissions({
        role: 'VISITOR',
        permissions: ['invented'],
        previousPermissions: [],
      }),
    ).toEqual({ ok: false })
    expect(transaction).not.toHaveBeenCalled()
  })

  test('refuses to strip permission management from the administrator role', async () => {
    expect(
      await updateRolePermissions({
        role: 'ADMIN',
        permissions: ['download_resources'],
        previousPermissions: ['manage_permissions', 'download_resources'],
      }),
    ).toEqual({ ok: false, reason: 'locked' })
    expect(transaction).not.toHaveBeenCalled()
  })

  test('replaces a role mapping when the previously displayed set still matches', async () => {
    findMany.mockResolvedValue([
      { permission: 'edit_components' },
      { permission: 'download_resources' },
    ])
    deleteMany.mockResolvedValue({ count: 2 })
    createMany.mockResolvedValue({ count: 1 })
    expect(
      await updateRolePermissions({
        role: 'ASSISTANT',
        permissions: ['download_resources'],
        previousPermissions: ['download_resources', 'edit_components'],
      }),
    ).toEqual({ ok: true, permissions: ['download_resources'] })
    expect(deleteMany).toHaveBeenCalledWith({ where: { role: 'ASSISTANT' } })
    expect(createMany).toHaveBeenCalledWith({
      data: [{ role: 'ASSISTANT', permission: 'download_resources' }],
    })
  })

  test('clears a role that should have no permissions', async () => {
    findMany.mockResolvedValue([{ permission: 'download_resources' }])
    expect(
      await updateRolePermissions({
        role: 'VISITOR',
        permissions: [],
        previousPermissions: ['download_resources'],
      }),
    ).toEqual({ ok: true, permissions: [] })
    expect(deleteMany).toHaveBeenCalledWith({ where: { role: 'VISITOR' } })
    expect(createMany).not.toHaveBeenCalled()
  })

  test('reports a concurrent change instead of overwriting it', async () => {
    findMany.mockResolvedValue([{ permission: 'edit_components' }])
    expect(
      await updateRolePermissions({
        role: 'ASSISTANT',
        permissions: ['download_resources'],
        previousPermissions: ['download_resources'],
      }),
    ).toEqual({ ok: false, reason: 'conflict' })
    expect(deleteMany).not.toHaveBeenCalled()
  })
})
