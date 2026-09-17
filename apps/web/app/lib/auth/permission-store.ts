import { cache } from 'react'

import { prisma } from '@lasce/db'
import type { UserRole } from '@lasce/db'

import { isPermission, type Permission } from './permissions'

/**
 * Permissions granted to a role, read from `auth.role_permissions` each time
 * and memoised for the request. A change to the matrix is visible on the next
 * request without re-login; the session cookie never stores the set.
 */
export const getPermissionsForRole = cache(
  async (role: UserRole | null): Promise<ReadonlySet<Permission>> => {
    if (!role) return new Set()
    const rows = await prisma.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    })
    return new Set(rows.map((row) => row.permission).filter(isPermission))
  },
)
