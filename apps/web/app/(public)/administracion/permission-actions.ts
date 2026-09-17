'use server'

import { updateRolePermissions } from '@/app/lib/role-permissions'
import type { PermissionChangeResult } from '@/app/lib/role-permissions'

export async function saveRolePermissions(input: unknown): Promise<PermissionChangeResult> {
  try {
    return await updateRolePermissions(input)
  } catch {
    return { ok: false }
  }
}
