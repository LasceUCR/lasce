import type { UserRole } from '@lasce/db'

import { canSeeAdminNavigation } from './account'
import type { Permission } from './permissions'

/**
 * What the signed-in account may do, as the header shows it (LASCE-SEC-001).
 * Client-safe: no `node:*`, no database. The values are always computed on the
 * server from the HttpOnly session and the current `auth.role_permissions`
 * matrix (`GET /api/session`), never from a cookie the browser can edit.
 *
 * They only decide which links and switches are rendered. Every page, Server
 * Action and Route Handler still checks its own permission on the server.
 */
export interface AccountCapabilities {
  name: string
  role: UserRole | null
  /** The Administración link. Same rule as the `administracion` layout, so it never offers a panel that would turn the account away. */
  canAccessAdmin: boolean
  /** The "Modo edición" switch: the role holds at least one content grant. */
  canEdit: boolean
}

/** The body of `GET /api/session`. */
export type SessionCapabilitiesResponse =
  { signedIn: false } | ({ signedIn: true } & AccountCapabilities)

/** The grants that unlock a create, edit or delete control somewhere in the portal. */
export const CONTENT_EDIT_PERMISSIONS = [
  'create_components',
  'edit_components',
  'delete_components',
] as const satisfies readonly Permission[]

/** Builds the capabilities from the session user and the grants their role holds right now. */
export function capabilitiesFor(
  user: { fullName: string; role: UserRole | null },
  held: ReadonlySet<Permission>,
): AccountCapabilities {
  return {
    name: user.fullName,
    role: user.role,
    canAccessAdmin: canSeeAdminNavigation(user.role),
    canEdit: CONTENT_EDIT_PERMISSIONS.some((permission) => held.has(permission)),
  }
}

/** The capabilities of nobody: what the header assumes until the server confirms more. */
export const NO_CAPABILITIES = { canAccessAdmin: false, canEdit: false } as const

/**
 * Validates a `GET /api/session` body. Anything unexpected is treated as signed
 * out, so a malformed or tampered response can never unlock a control.
 */
export function parseSessionCapabilities(body: unknown): SessionCapabilitiesResponse {
  if (typeof body !== 'object' || body === null || !('signedIn' in body)) {
    return { signedIn: false }
  }
  const value = body as Record<string, unknown>
  if (value.signedIn !== true || typeof value.name !== 'string') return { signedIn: false }
  const role =
    value.role === 'VISITOR' || value.role === 'ASSISTANT' || value.role === 'ADMIN'
      ? value.role
      : null
  return {
    signedIn: true,
    name: value.name,
    role,
    canAccessAdmin: value.canAccessAdmin === true,
    canEdit: value.canEdit === true,
  }
}
