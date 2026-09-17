import { beforeEach, describe, expect, test, vi } from 'vitest'

const { findMany, getSessionUser, requireUser } = vi.hoisted(() => ({
  findMany: vi.fn(),
  getSessionUser: vi.fn(),
  requireUser: vi.fn(),
}))

vi.mock('@lasce/db', () => ({
  prisma: { rolePermission: { findMany } },
}))

vi.mock('./session', () => ({ getSessionUser, requireUser }))

const { getPermissionsForRole, requireAnyPermission, requirePermission, userHasPermission } =
  await import('./authorization')

const admin = {
  id: 'admin-1',
  fullName: 'Ana',
  email: 'ana@example.com',
  institution: 'UCR',
  countryCode: 'CR',
  role: 'ADMIN' as const,
  createdAt: new Date('2026-09-15T00:00:00.000Z'),
}

beforeEach(() => {
  vi.clearAllMocks()
  getSessionUser.mockResolvedValue(admin)
  requireUser.mockResolvedValue(admin)
  findMany.mockResolvedValue([
    { permission: 'edit_components' },
    { permission: 'download_resources' },
    { permission: 'invented' },
  ])
})

describe('authorization', () => {
  test('loads the role matrix once and ignores unknown permission strings', async () => {
    await expect(getPermissionsForRole('ASSISTANT')).resolves.toEqual(
      new Set(['edit_components', 'download_resources']),
    )
    expect(findMany).toHaveBeenCalledWith({
      where: { role: 'ASSISTANT' },
      select: { permission: true },
    })
    await expect(getPermissionsForRole(null)).resolves.toEqual(new Set())
    expect(findMany).toHaveBeenCalledTimes(1)
  })

  test('grants a signed-in user only the permissions stored for their role', async () => {
    await expect(userHasPermission('edit_components')).resolves.toBe(true)
    await expect(userHasPermission('create_components')).resolves.toBe(false)
    getSessionUser.mockResolvedValue(null)
    await expect(userHasPermission('edit_components')).resolves.toBe(false)
  })

  test('asks for a session and then reports whether the permission is held', async () => {
    await expect(requirePermission('edit_components', '/administracion')).resolves.toEqual({
      user: admin,
      allowed: true,
    })
    await expect(requirePermission('create_components', '/administracion')).resolves.toEqual({
      user: admin,
      allowed: false,
    })
    expect(requireUser).toHaveBeenCalledWith('/administracion')
  })

  test('allows a page that any of several permissions can unlock', async () => {
    await expect(
      requireAnyPermission(
        ['create_components', 'edit_components', 'delete_components'],
        '/administracion',
      ),
    ).resolves.toEqual({
      user: admin,
      allowed: true,
      granted: ['edit_components'],
    })
    const visitor = { ...admin, role: 'VISITOR' as const }
    requireUser.mockResolvedValue(visitor)
    findMany.mockResolvedValue([])
    await expect(requireAnyPermission(['create_components'], '/administracion')).resolves.toEqual({
      user: visitor,
      allowed: false,
      granted: [],
    })
  })
})
