import { getPermissionsForRole } from './permission-store'
import type { Permission } from './permissions'
import { getSessionUser, requireUser, type SessionUser } from './session'

export { getPermissionsForRole }

export async function userHasPermission(permission: Permission): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  return (await getPermissionsForRole(user.role)).has(permission)
}

export async function requirePermission(
  permission: Permission,
  returnTo: string,
): Promise<{ user: SessionUser; allowed: boolean }> {
  const user = await requireUser(returnTo)
  return { user, allowed: (await getPermissionsForRole(user.role)).has(permission) }
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
  returnTo: string,
): Promise<{ user: SessionUser; allowed: boolean; granted: Permission[] }> {
  const user = await requireUser(returnTo)
  const held = await getPermissionsForRole(user.role)
  const granted = permissions.filter((permission) => held.has(permission))
  return { user, allowed: granted.length > 0, granted }
}
