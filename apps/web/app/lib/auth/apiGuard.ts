import { NextResponse } from 'next/server'

import { getPermissionsForRole } from './permission-store'
import type { Permission } from './permissions'
import { getSessionUser, type SessionUser } from './session'

export type ApiGuardResult = { ok: true; user: SessionUser } | { ok: false; response: NextResponse }

/**
 * Route Handler guard for JSON endpoints: 401 with no session, 403 when the
 * account's role does not hold `permission`. `requireUser` / `requirePermission`
 * (authorization.ts) are the wrong tools here — they redirect, which a
 * client-side `fetch` expecting JSON cannot follow.
 *
 * Do not branch on `role === 'ADMIN'`. The matrix on `/administracion/permisos`
 * is the source of who may create, edit or delete.
 */
export async function requireApiPermission(permission: Permission): Promise<ApiGuardResult> {
  const user = await getSessionUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No ha iniciado sesión.' }, { status: 401 }),
    }
  }

  const held = await getPermissionsForRole(user.role)
  if (!held.has(permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No tiene permisos para modificar este contenido.' },
        { status: 403 },
      ),
    }
  }

  return { ok: true, user }
}
