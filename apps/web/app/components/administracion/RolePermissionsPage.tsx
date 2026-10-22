import { useTranslations } from 'next-intl'
import type { Ref } from 'react'

import type { Permission } from '@/app/lib/auth/permissions'
import type { OverviewRole } from '@/app/lib/user-overview'
import { Button } from '@/app/components/public/Button'

import styles from './RolePermissionsPage.module.css'
import tableStyles from './UsersRolesTable.module.css'

export interface RolePermissionRow {
  id: Permission
  label: string
  /** What the permission allows, shown under its label. */
  description?: string
}

/**
 * The permission matrix of `/administracion/permisos`. Its own fixed text comes from the
 * `administration.permissions` catalogue; roles and permissions arrive already named in the
 * site's language (`roleName`, `permissionRows` in `app/lib/access-messages.ts`).
 */
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
  /**
   * The save confirmation is open: the controls wait for it like they wait for a save, but the
   * button still says "Guardar cambios", since nothing is being saved yet.
   */
  confirming?: boolean
  canSave?: boolean
  pendingChanges?: number
  dirtyPermissionIds?: readonly Permission[]
  error?: string
  status?: string
  /**
   * The scrollable table region. The editor moves focus to it after the confirmation closes or
   * the draft is discarded, because the button that was used is disabled by then.
   */
  tableRegionRef?: Ref<HTMLDivElement>
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
  confirming = false,
  canSave = true,
  pendingChanges = 0,
  dirtyPermissionIds = [],
  error,
  status,
  tableRegionRef,
}: RolePermissionsPageProps) {
  const t = useTranslations('administration.permissions')
  return (
    <div>
      <div className="section-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <form
        aria-busy={saving || undefined}
        className={`surface-card admin-panel ${styles.form}`}
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
      >
        <h2 id="role-permissions-title">{t('tableTitle')}</h2>
        <p id="role-permissions-help" className={styles.help}>
          {t('help')}
        </p>
        <div
          ref={tableRegionRef}
          className={tableStyles.scroll}
          role="region"
          aria-label={t('tableLabel')}
          tabIndex={0}
        >
          <table
            className={tableStyles.table}
            aria-labelledby="role-permissions-title"
            aria-describedby="role-permissions-help"
          >
            <thead>
              <tr>
                <th scope="col" className={styles.permissionColumn}>
                  {t('permissionColumn')}
                </th>
                {roles.map((role) => (
                  <th scope="col" key={role.id} className={tableStyles.assignment}>
                    {role.name}
                    {lockedRoleIds.includes(role.id) ? (
                      <span className={styles.lockedNote}>{t('lockedRole')}</span>
                    ) : null}
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
                        {dirty ? <span className="sr-only">{t('unsavedSuffix')}</span> : null}
                      </span>
                      {permission.description ? (
                        <span className={styles.permissionDescription}>
                          {permission.description}
                        </span>
                      ) : null}
                    </th>
                    {roles.map((role) => {
                      const locked = lockedRoleIds.includes(role.id)
                      return (
                        <td key={role.id} className={tableStyles.assignment}>
                          <label className={tableStyles.checkboxTarget}>
                            <input
                              type="checkbox"
                              checked={granted[role.id]?.includes(permission.id) ?? false}
                              disabled={locked || saving || confirming}
                              aria-label={t(locked ? 'checkboxLocked' : 'checkbox', {
                                permission: permission.label,
                                role: role.name,
                              })}
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
                    {t('pending', { count: pendingChanges })}
                  </p>
                  <p className={styles.pendingHelp}>{t('pendingHelp')}</p>
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
              disabled={saving || confirming || pendingChanges === 0}
              onClick={onDiscard}
            >
              {t('discard')}
            </Button>
            <Button type="submit" disabled={saving || confirming || !canSave}>
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
