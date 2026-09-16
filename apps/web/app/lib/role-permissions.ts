import { prisma, UserRole } from '@lasce/db'
import { z } from 'zod'

import { getPermissionsForRole } from './auth/permission-store'
import {
  isPermission,
  isRolePermissionsLocked,
  PERMISSIONS,
  sortPermissions,
  type Permission,
} from './auth/permissions'
import { getSessionUser } from './auth/session'

export type RolePermissionMap = Record<UserRole, Permission[]>

export type PermissionChangeResult =
  | { ok: true; permissions: Permission[] }
  | { ok: false; reason?: 'conflict' | 'unauthorized' | 'locked' }

function samePermissions(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((permission) => right.includes(permission))
}

async function actorCanManagePermissions(): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  return (await getPermissionsForRole(user.role)).has('manage_permissions')
}

export async function getPermissionMatrix(): Promise<RolePermissionMap> {
  if (!(await actorCanManagePermissions())) throw new Error('Unauthorized')
  const rows = await prisma.rolePermission.findMany({
    select: { role: true, permission: true },
  })
  const matrix: RolePermissionMap = {
    VISITOR: [],
    ASSISTANT: [],
    ADMIN: [],
  }
  for (const row of rows) {
    if (isPermission(row.permission)) matrix[row.role].push(row.permission)
  }
  for (const role of Object.values(UserRole)) {
    matrix[role] = sortPermissions(matrix[role])
  }
  return matrix
}

const changeSchema = z.object({
  role: z.enum(UserRole),
  permissions: z.array(z.enum(PERMISSIONS)),
  previousPermissions: z.array(z.enum(PERMISSIONS)),
})

export async function updateRolePermissions(input: unknown): Promise<PermissionChangeResult> {
  if (!(await actorCanManagePermissions())) {
    return { ok: false, reason: 'unauthorized' }
  }
  const parsed = changeSchema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const role = parsed.data.role
  const permissions = sortPermissions([...new Set(parsed.data.permissions)])
  const previousPermissions = sortPermissions([...new Set(parsed.data.previousPermissions)])
  if (isRolePermissionsLocked(role)) {
    return { ok: false, reason: 'locked' }
  }

  return prisma.$transaction(async (tx) => {
    const current = await tx.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    })
    const currentPermissions = current.map((row) => row.permission).filter(isPermission)
    if (!samePermissions(currentPermissions, previousPermissions)) {
      return { ok: false, reason: 'conflict' }
    }
    await tx.rolePermission.deleteMany({ where: { role } })
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({ role, permission })),
      })
    }
    return { ok: true, permissions }
  })
}
