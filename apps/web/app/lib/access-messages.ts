import type { UserRole } from '@lasce/db'

import es from '@/messages/es.json' with { type: 'json' }

import { PERMISSIONS, type Permission } from './auth/permissions'

/**
 * Role and permission names, in the visitor's language, looked up by their stable identifiers
 * (LASCE-SEC-008). The identifiers (`ADMIN`, `manage_permissions`) are what authorization checks
 * and the database use; the text here is only ever shown, never stored or compared.
 *
 * The catalogue holds them under `access`, keyed by identifier, so any screen can reuse them:
 * `access.roles.<UserRole>` and `access.permissions.<Permission>.label|description|denied`.
 * Client-safe: it imports nothing from the server, and `UserRole` only as a type.
 *
 * Every lookup falls back to the Spanish text when the given catalogue has no text for that
 * identifier, so a gap never shows an empty label or a key path.
 */

type AccessCatalogue = typeof es.access

/** Any catalogue slice that may carry `access`, such as `useMessages()` or `getMessages()`. */
export interface AccessMessages {
  access?: {
    roles?: Partial<Record<string, string>>
    permissions?: Partial<
      Record<string, Partial<Record<keyof AccessCatalogue['permissions'][Permission], string>>>
    >
  }
}

export interface PermissionText {
  label: string
  description: string
  /** What an account without this permission is told. */
  denied: string
}

/** `value` unless it is missing or blank, else `fallback`. */
function textOr(value: string | undefined, fallback: string): string {
  return value && value.trim() !== '' ? value : fallback
}

/** The name of `role` in the language of `messages`. */
export function roleName(role: UserRole, messages: AccessMessages = es): string {
  return textOr(messages.access?.roles?.[role], es.access.roles[role])
}

/** The label, description and access-denied message of `permission`. */
export function permissionText(
  permission: Permission,
  messages: AccessMessages = es,
): PermissionText {
  const source = es.access.permissions[permission]
  const own = messages.access?.permissions?.[permission]

  return {
    label: textOr(own?.label, source.label),
    description: textOr(own?.description, source.description),
    denied: textOr(own?.denied, source.denied),
  }
}

/** Every permission in catalogue order (`PERMISSIONS`), with its text. */
export function permissionRows(
  messages: AccessMessages = es,
): ({ id: Permission } & PermissionText)[] {
  return PERMISSIONS.map((id) => ({ id, ...permissionText(id, messages) }))
}
