import { NextResponse } from 'next/server'

import { capabilitiesFor, type SessionCapabilitiesResponse } from '@/app/lib/auth/capabilities'
import { getPermissionsForRole } from '@/app/lib/auth/permission-store'
import { getSessionUser } from '@/app/lib/auth/session'

/**
 * Who is signed in and what the header may offer them (LASCE-SEC-001).
 *
 *   GET /api/session
 *
 * Read from the HttpOnly `lasce_session` cookie and the current permission
 * matrix on every request, so a role or matrix change shows on the next call
 * and an edited `lasce_account` cookie changes nothing. Always 200: a missing,
 * expired or revoked session is `{ "signedIn": false }`, not an error.
 *
 * This only drives which links and switches are rendered. It is not an
 * authorization check; protected pages, Server Actions and Route Handlers keep
 * their own.
 */
export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET(): Promise<NextResponse<SessionCapabilitiesResponse>> {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json<SessionCapabilitiesResponse>({ signedIn: false }, { headers: noStore })
  }

  const held = await getPermissionsForRole(user.role)
  return NextResponse.json<SessionCapabilitiesResponse>(
    { signedIn: true, ...capabilitiesFor(user, held) },
    { headers: noStore },
  )
}
