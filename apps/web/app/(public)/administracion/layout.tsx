import type { ReactNode } from 'react'

import { AccessDenied } from '@/app/components/administracion/AccessDenied'
import { AdminShell } from '@/app/components/administracion/AdminShell'
import { adminAccessDeniedMessage, canSeeAdminNavigation } from '@/app/lib/auth/account'
import { getPermissionsForRole } from '@/app/lib/auth/permission-store'
import { getSessionUser } from '@/app/lib/auth/session'

// Reading the session cookie already makes the section request-time rendered,
// which is what lets the menu follow `auth.role_permissions` without a new login.
export const dynamic = 'force-dynamic'

/**
 * The layout of the protected section, not the shared `(public)` one, so the
 * checks here cost nothing on the rest of the site. Signed-in visitors see
 * Acceso denegado, by the same rule that hides the header tab from them.
 * Assistants and administrators get the menu with the sections their grants
 * unlock, and every section page still runs its own `requirePermission`.
 *
 * An anonymous request is passed through: every page under this layout calls
 * `requireUser` with its own path, so the login page brings the visitor back to
 * the section they asked for. Redirecting here as well would race that redirect
 * and win with the less precise `/administracion`.
 */
export default async function AdministracionLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()

  if (!user) {
    return children
  }

  if (!canSeeAdminNavigation(user.role)) {
    return <AccessDenied message={adminAccessDeniedMessage} />
  }

  const held = await getPermissionsForRole(user.role)

  return <AdminShell granted={[...held]}>{children}</AdminShell>
}
