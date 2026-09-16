'use server'

import { updateUserRole } from '@/app/lib/user-administration'
import type { RoleChangeResult } from '@/app/lib/user-administration'

export async function saveUserRole(input: unknown): Promise<RoleChangeResult> {
  try {
    return await updateUserRole(input)
  } catch {
    return { ok: false }
  }
}
