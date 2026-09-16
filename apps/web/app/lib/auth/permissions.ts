import type { UserRole } from '@lasce/db'

/**
 * Catalogue of capabilities the platform can grant to a role (LASCE-SEC-008-073).
 * Adding a permission here (and a default below) is enough for new pages to
 * call `requirePermission` without touching login, sessions or unrelated admin
 * screens. The mapping itself is stored in `auth.role_permissions`.
 *
 * Component create/edit/delete will gate content-management screens that do not
 * exist yet. `download_resources` is the only grant that covers laboratory
 * resources: downloading them.
 */
export const PERMISSIONS = [
  'create_components',
  'edit_components',
  'delete_components',
  'download_resources',
  'manage_users',
  'manage_permissions',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export const PERMISSION_LABELS: Record<Permission, string> = {
  create_components: 'Crear componentes',
  edit_components: 'Editar componentes',
  delete_components: 'Eliminar componentes',
  download_resources: 'Descargar recursos',
  manage_users: 'Administrar usuarios',
  manage_permissions: 'Configurar permisos',
}

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  create_components: 'Crear componentes del portal cuando esa función esté disponible.',
  edit_components: 'Editar componentes del portal cuando esa función esté disponible.',
  delete_components: 'Eliminar componentes del portal cuando esa función esté disponible.',
  download_resources: 'Descargar recursos del laboratorio y consultar el historial de descargas.',
  manage_users: 'Consultar cuentas y asignar o retirar roles.',
  manage_permissions: 'Ver y cambiar los permisos asociados a cada rol.',
}

export const PERMISSION_DENIED: Record<Permission, string> = {
  create_components: 'No tienes autorización para crear componentes.',
  edit_components: 'No tienes autorización para editar componentes.',
  delete_components: 'No tienes autorización para eliminar componentes.',
  download_resources: 'No tienes autorización para acceder a las descargas.',
  manage_users: 'No tienes autorización para administrar usuarios.',
  manage_permissions: 'No tienes autorización para configurar los permisos de los roles.',
}

/** Seeded by the role-permissions migration; administrators can change it later. */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  VISITOR: ['download_resources'],
  ASSISTANT: ['edit_components', 'download_resources'],
  ADMIN: [
    'create_components',
    'edit_components',
    'delete_components',
    'download_resources',
    'manage_users',
    'manage_permissions',
  ],
}

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}

/** The administrator matrix is read-only in the management UI and on write. */
export function isRolePermissionsLocked(role: UserRole): boolean {
  return role === 'ADMIN'
}

export function lockedPermissionsForRole(role: UserRole): readonly Permission[] {
  return isRolePermissionsLocked(role) ? PERMISSIONS : []
}

export function sortPermissions(permissions: readonly Permission[]): Permission[] {
  return PERMISSIONS.filter((permission) => permissions.includes(permission))
}
