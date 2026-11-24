import { prisma, UserRole } from '@lasce/db'
import { z } from 'zod'

import { recordUserAuditEvent } from './audit-log'
import { ROLE_LABELS } from './auth/account'
import { userHasPermission } from './auth/authorization'
import { countryName } from './auth/countries'
import { getSessionUser } from './auth/session'
import type { OverviewRole, OverviewUser } from './user-overview'

// The enum is the platform's current role configuration, not a second role registry.
export function availableRoles(): OverviewRole[] {
  return Object.values(UserRole).map((id) => ({ id, name: ROLE_LABELS[id] }))
}

/** `locale` only chooses the language of the country name; names and e-mails are user data. */
export async function getUserOverview(locale: string = 'es'): Promise<OverviewUser[]> {
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
    country: countryName(user.countryCode, locale),
    roleIds: user.role ? [user.role] : [],
  }))
}

const changeSchema = z.object({
  userId: z.uuid(),
  roleIds: z.array(z.enum(UserRole)).max(1),
  previousRoleIds: z.array(z.enum(UserRole)).max(1),
})

export type RoleChangeResult =
  | { ok: true; roleIds: string[] }
  | { ok: false; reason?: 'conflict' | 'unauthorized' | 'lastAdministrator' }

const NO_ROLE_LABEL = 'Sin rol'

function roleLabel(role: UserRole | null): string {
  return role ? ROLE_LABELS[role] : NO_ROLE_LABEL
}

export async function updateUserRole(input: unknown): Promise<RoleChangeResult> {
  if (!(await userHasPermission('manage_users'))) return { ok: false, reason: 'unauthorized' }
  const actor = await getSessionUser()
  if (!actor) return { ok: false, reason: 'unauthorized' }
  const parsed = changeSchema.safeParse(input)
  if (!parsed.success) return { ok: false }
  const { userId, roleIds, previousRoleIds } = parsed.data
  const previousRole = previousRoleIds[0] ?? null
  const newRole = roleIds[0] ?? null

  // The change and its audit event are one transaction: neither is kept without the other.
  return prisma.$transaction(async (tx): Promise<RoleChangeResult> => {
    // The platform always keeps at least one administrator, whoever makes the change (an
    // administrator may change their own role only while another one exists). Every
    // administrator row is locked, in a fixed order, so two concurrent demotions cannot each
    // count the other: the second waits, then no longer sees the first one's target.
    if (previousRole === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
      const administrators = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM auth.users WHERE role = 'admin' ORDER BY id FOR UPDATE`
      // PostgreSQL prints a uuid in lower case; the validated input may be in upper case.
      const targetId = userId.toLowerCase()
      const ids = administrators.map((administrator) => administrator.id.toLowerCase())
      // A target that is no longer an administrator is a stale page: the compare-and-set below
      // reports it as a conflict, which asks for a reload.
      if (ids.includes(targetId) && ids.every((id) => id === targetId)) {
        return { ok: false, reason: 'lastAdministrator' }
      }
    }

    // Compare-and-set: another administrator's intervening change is not overwritten.
    const result = await tx.user.updateMany({
      where: { id: userId, role: previousRole },
      data: { role: newRole },
    })
    if (result.count !== 1) return { ok: false, reason: 'conflict' }

    const target = await tx.user.findUnique({ where: { id: userId }, select: { fullName: true } })
    await recordUserAuditEvent(tx, actor, {
      action: 'user.role_change',
      summary: `Rol de ${target?.fullName ?? 'una cuenta'} cambiado de ${roleLabel(previousRole)} a ${roleLabel(newRole)}`,
      entityType: 'user',
      entityId: userId,
      metadata: { previousRole, newRole },
    })
    return { ok: true, roleIds }
  })
}
