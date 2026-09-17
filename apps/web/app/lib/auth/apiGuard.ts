import { NextResponse } from 'next/server'

import { getSessionUser, type SessionUser } from './session'

export type AdminGuardResult =
  { ok: true; user: SessionUser } | { ok: false; response: NextResponse }

/**
 * Route Handler guard for admin-only JSON endpoints: 401 with no session,
 * 403 with one that isn't `ADMIN`. `requireUser` (session.ts) isn't the right
 * tool here — it redirects, which makes no sense for a client-side `fetch`
 * expecting JSON back.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const user = await getSessionUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No ha iniciado sesión.' }, { status: 401 }),
    }
  }

  if (user.role !== 'ADMIN') {
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
