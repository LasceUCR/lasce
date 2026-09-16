import type { Permission } from '@/app/lib/auth/permissions'
import type { OverviewRole } from '@/app/lib/user-overview'
import { Button } from '@/app/components/public/Button'

import styles from './RolePermissionsPage.module.css'
import tableStyles from './UsersRolesTable.module.css'

export interface RolePermissionRow {
  id: Permission
  label: string
}

export interface RolePermissionsPageProps {
  title: string
  description: string
  roles: OverviewRole[]
  permissions: RolePermissionRow[]
  granted: Record<string, readonly Permission[]>
  lockedRoleIds: readonly string[]
  onTogglePermission: (roleId: string, permission: Permission) => void
  onSave: () => Promise<void>
  onDiscard?: () => void
  saving?: boolean
  canSave?: boolean
  pendingChanges?: number
  dirtyPermissionIds?: readonly Permission[]
  error?: string
  status?: string
}

export function RolePermissionsPage({
  title,
  description,
  roles,
  permissions,
  granted,
  lockedRoleIds,
  onTogglePermission,
  onSave,
  onDiscard,
  saving = false,
  canSave = true,
  pendingChanges = 0,
  dirtyPermissionIds = [],
  error,
  status,
}: RolePermissionsPageProps) {
  const pendingCopy =
    pendingChanges === 1 ? '1 cambio sin guardar' : `${pendingChanges} cambios sin guardar`
  return (
    <div>
      <div className="section-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <form
        className={`surface-card admin-panel ${styles.form}`}
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
      >
        <h2 id="role-permissions-title">Permisos por rol</h2>
        <p id="role-permissions-help" className={styles.help}>
          Cada casilla indica si el rol puede hacer esa acción. Los permisos de la persona
          administradora no se pueden cambiar. Guardar cambios pide confirmación antes de
          aplicarlos.
        </p>
        <div
          className={tableStyles.scroll}
          role="region"
          aria-label="Tabla de permisos por rol"
          tabIndex={0}
        >
          <table
            className={tableStyles.table}
            aria-labelledby="role-permissions-title"
            aria-describedby="role-permissions-help"
          >
            <thead>
              <tr>
                <th scope="col">Permiso</th>
                {roles.map((role) => (
                  <th scope="col" key={role.id} className={tableStyles.assignment}>
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => {
                const dirty = dirtyPermissionIds.includes(permission.id)
                return (
                  <tr key={permission.id} className={dirty ? styles.dirtyRow : undefined}>
                    <th scope="row">
                      <span className={styles.permissionLabel}>
                        {dirty ? <span className={styles.dirtyMark} aria-hidden="true" /> : null}
                        {permission.label}
                        {dirty ? <span className="sr-only">, sin guardar</span> : null}
                      </span>
                    </th>
                    {roles.map((role) => {
                      const locked = lockedRoleIds.includes(role.id)
                      return (
                        <td key={role.id} className={tableStyles.assignment}>
                          <label className={tableStyles.checkboxTarget}>
                            <input
                              type="checkbox"
                              checked={granted[role.id]?.includes(permission.id) ?? false}
                              disabled={locked || saving}
                              aria-label={`${permission.label}: ${role.name}`}
                              onChange={() => onTogglePermission(role.id, permission.id)}
                            />
                          </label>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.footer}>
          <div className={styles.pending}>
            {pendingChanges > 0 ? (
              <>
                <span className={styles.dot} aria-hidden="true" />
                <div>
                  <p className={styles.pendingTitle} role="status" aria-atomic="true">
                    {pendingCopy}
                  </p>
                  <p className={styles.pendingHelp}>
                    Tienes cambios pendientes de guardar en los permisos.
                  </p>
                </div>
              </>
            ) : (
              <p className={status ? styles.status : 'sr-only'} role="status" aria-atomic="true">
                {status ?? ''}
              </p>
            )}
          </div>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              disabled={saving || pendingChanges === 0}
              onClick={onDiscard}
            >
              Descartar
            </Button>
            <Button type="submit" disabled={saving || !canSave}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
