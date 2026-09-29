import type { ReactNode } from 'react'

import { AdminShell } from '@/app/components/administracion/AdminShell'
import { getPermissionsForRole } from '@/app/lib/auth/permission-store'
import { getSessionUser } from '@/app/lib/auth/session'

// Reading the session cookie already makes the section request-time rendered,
// which is what lets the menu follow `auth.role_permissions` without a new login.
export const dynamic = 'force-dynamic'

/**
 * The layout of the protected section, not the shared `(public)` one, so the
 * grant lookup costs nothing on the rest of the site. `getSessionUser` never
 * redirects: anonymous visitors keep the public Resumen and see only the
 * public menu entries. Every section page still runs its own `requirePermission`.
 */
export default async function AdministracionLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  const held = await getPermissionsForRole(user?.role ?? null)

  return <AdminShell granted={[...held]}>{children}</AdminShell>
}
