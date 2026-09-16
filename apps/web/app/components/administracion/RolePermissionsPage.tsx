import type { Permission } from '@/app/lib/auth/permissions'
import type { OverviewRole } from '@/app/lib/user-overview'
import { Button } from '@/app/components/public/Button'

import styles from './RolePermissionsPage.module.css'

export interface RolePermissionsPageProps {
  title: string
  description: string
  roles: OverviewRole[]
  selectedRoleId: string
  onSelectRole: (roleId: string) => void
  permissions: Array<{
    id: Permission
    label: string
    description: string
    checked: boolean
    locked: boolean
  }>
  onTogglePermission: (permission: Permission) => void
  onSave: () => Promise<void>
  saving?: boolean
  canSave?: boolean
  error?: string
  status?: string
}

export function RolePermissionsPage({
  title,
  description,
  roles,
  selectedRoleId,
  onSelectRole,
  permissions,
  onTogglePermission,
  onSave,
  saving = false,
  canSave = true,
  error,
  status,
}: RolePermissionsPageProps) {
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
          Selecciona un rol para ver sus permisos actuales. Los cambios se aplican a los controles
          de acceso en la siguiente solicitud, sin volver a iniciar sesión.
        </p>
        <fieldset className={styles.roles} aria-describedby="role-permissions-help">
          <legend>Rol</legend>
          <div role="radiogroup" aria-label="Rol" className={styles.roleList}>
            {roles.map((role) => (
              <label key={role.id} className={styles.roleOption}>
                <input
                  type="radio"
                  name="role"
                  value={role.id}
                  checked={selectedRoleId === role.id}
                  onChange={() => onSelectRole(role.id)}
                />
                {role.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.permissions} disabled={saving}>
          <legend>Permisos asociados</legend>
          <ul className={styles.permissionList}>
            {permissions.map((permission) => (
              <li key={permission.id}>
                <label className={styles.permission}>
                  <input
                    type="checkbox"
                    checked={permission.checked}
                    disabled={permission.locked}
                    aria-describedby={`${permission.id}-description${permission.locked ? ` ${permission.id}-locked` : ''}`}
                    onChange={() => onTogglePermission(permission.id)}
                  />
                  <span>
                    <span className={styles.permissionLabel}>{permission.label}</span>
                    <span id={`${permission.id}-description`} className={styles.permissionHelp}>
                      {permission.description}
                    </span>
                    {permission.locked ? (
                      <span id={`${permission.id}-locked`} className={styles.permissionHelp}>
                        Obligatorio para este rol.
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <p className={status ? styles.status : 'sr-only'} role="status" aria-atomic="true">
          {status ?? ''}
        </p>
        <Button type="submit" disabled={saving || !canSave}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </div>
  )
}
