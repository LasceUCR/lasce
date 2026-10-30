'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'
import { UserRoleChangeDialog } from './UserRoleChangeDialog'
import styles from './UsersRolesTable.module.css'

const subscribeToHydration = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export interface UserRolesRowProps {
  isCurrentUser?: boolean
  user: OverviewUser
  roles: OverviewRole[]
  onUserSelect?: (user: OverviewUser) => void
  onSaveRoles?: (userId: string, roleIds: string[]) => Promise<void>
  hidden?: boolean
}

export function UserRolesRow({
  user,
  roles,
  onUserSelect,
  onSaveRoles,
  hidden,
  isCurrentUser,
}: UserRolesRowProps) {
  // A native checkbox can change before React can ask for confirmation.
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  // Undefined means closed; null means confirmation to remove the current role.
  const [pendingRole, setPendingRole] = useState<OverviewRole | null | undefined>(undefined)
  const t = useTranslations('administration.users')
  const toast = useToast()
  // The error toast of the previous attempt, dismissed when the next one starts.
  const errorToast = useRef<number | null>(null)

  async function confirm() {
    if (!onSaveRoles || pendingRole === undefined) return
    if (errorToast.current !== null) toast.dismiss(errorToast.current)
    errorToast.current = null
    await onSaveRoles(user.id, pendingRole ? [pendingRole.id] : [])
    // Close first, so the success toast shows on the page rather than in a closing dialog.
    setPendingRole(undefined)
    toast.show(
      'success',
      pendingRole
        ? t('updated', { name: user.name, role: pendingRole.name })
        : t('removed', { name: user.name }),
    )
  }

  return (
    <tr hidden={hidden}>
      <th scope="row">
        {onUserSelect ? (
          <button
            type="button"
            className={styles.userName}
            aria-haspopup="dialog"
            disabled={!hydrated}
            onClick={() => onUserSelect(user)}
          >
            {user.name}
          </button>
        ) : (
          user.name
        )}
        {pendingRole !== undefined && (
          <UserRoleChangeDialog
            isCurrentUser={isCurrentUser}
            user={user}
            currentRoles={roles.filter((role) => user.roleIds.includes(role.id))}
            role={pendingRole}
            onError={(message) => {
              errorToast.current = toast.show('error', message)
            }}
            onConfirm={confirm}
            onClose={() => setPendingRole(undefined)}
          />
        )}
      </th>
      <td>{user.email}</td>
      {roles.map((role) => (
        <td key={role.id} className={styles.assignment}>
          <label className={styles.checkboxTarget}>
            <input
              type="checkbox"
              checked={user.roleIds.includes(role.id)}
              disabled={!hydrated || !onSaveRoles}
              onChange={() => {
                setPendingRole(user.roleIds.includes(role.id) ? null : role)
              }}
              aria-haspopup={onSaveRoles ? 'dialog' : undefined}
              aria-label={t('checkbox', { role: role.name, name: user.name, email: user.email })}
            />
          </label>
        </td>
      ))}
    </tr>
  )
}
