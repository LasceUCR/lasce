import { prisma, UserRole } from '@lasce/db'
import { z } from 'zod'

import { ROLE_LABELS } from './auth/account'
import { userHasPermission } from './auth/authorization'
import { countryName } from './auth/countries'
import type { OverviewRole, OverviewUser } from './user-overview'

// The enum is the platform's current role configuration, not a second role registry.
export function availableRoles(): OverviewRole[] {
  return Object.values(UserRole).map((id) => ({ id, name: ROLE_LABELS[id] }))
}

export async function getUserOverview(): Promise<OverviewUser[]> {
  if (!(await userHasPermission('manage_users'))) throw new Error('Unauthorized')
  const users = await prisma.user.findMany({
    orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      fullName: true,
      email: true,
      institution: true,
      countryCode: true,
      role: true,
    },
  })
  return users.map((user) => ({
    id: user.id,
    name: user.fullName,
    email: user.email,
    institution: user.institution,
    country: countryName(user.countryCode),
    roleIds: user.role ? [user.role] : [],
  }))
}

const changeSchema = z.object({
  userId: z.uuid(),
  roleIds: z.array(z.enum(UserRole)).max(1),
  previousRoleIds: z.array(z.enum(UserRole)).max(1),
})

export type RoleChangeResult =
  { ok: true; roleIds: string[] } | { ok: false; reason?: 'conflict' | 'unauthorized' }

export async function updateUserRole(input: unknown): Promise<RoleChangeResult> {
  if (!(await userHasPermission('manage_users'))) return { ok: false, reason: 'unauthorized' }
  const parsed = changeSchema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const { userId, roleIds, previousRoleIds } = parsed.data
  // Compare-and-set: another administrator's intervening change is not overwritten.
  const result = await prisma.user.updateMany({
    where: { id: userId, role: previousRoleIds[0] ?? null },
    data: { role: roleIds[0] ?? null },
  })
  return result.count === 1 ? { ok: true, roleIds } : { ok: false, reason: 'conflict' }
}
