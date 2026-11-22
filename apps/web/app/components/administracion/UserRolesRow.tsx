'use client'

import { useId, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'
import { UserRoleChangeDialog } from './UserRoleChangeDialog'
import styles from './UsersRolesTable.module.css'

const subscribeToHydration = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false
/** The value of the "Sin rol" option; never sent to the server, which receives `[]`. */
const NO_ROLE = 'none'

export interface UserRolesRowProps {
  isCurrentUser?: boolean
  user: OverviewUser
  roles: OverviewRole[]
  onUserSelect?: (user: OverviewUser) => void
  onSaveRoles?: (userId: string, roleIds: string[]) => Promise<void>
  hidden?: boolean
  /** The id of the text explaining what an account without a role can do. */
  noRoleDescribedBy?: string
}

interface RoleOption {
  /** `null` is the "Sin rol" option. */
  id: string | null
  name: string
  role: OverviewRole | null
}

export function UserRolesRow({
  user,
  roles,
  onUserSelect,
  onSaveRoles,
  hidden,
  isCurrentUser,
  noRoleDescribedBy,
}: UserRolesRowProps) {
  // A native radio button can change before React can ask for confirmation.
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot)
  // Undefined means closed; null means confirmation to remove the current role.
  const [pendingRole, setPendingRole] = useState<OverviewRole | null | undefined>(undefined)
  const t = useTranslations('administration.users')
  const toast = useToast()
  // The error toast of the previous attempt, dismissed when the next one starts.
  const errorToast = useRef<number | null>(null)
  // One radio group per row: the browser keeps a single option checked and moves between them
  // with the arrow keys.
  const groupName = `role-${useId()}`
  // A role missing from `roles` leaves every option unchecked rather than claiming "Sin rol".
  const currentRoleId = user.roleIds[0] ?? null
  const options: RoleOption[] = [
    ...roles.map((role) => ({ id: role.id, name: role.name, role })),
    { id: null, name: t('table.noRole'), role: null },
  ]

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
      {options.map((option) => (
        <td key={option.id ?? NO_ROLE} className={styles.assignment}>
          <label className={styles.optionTarget}>
            <input
              type="radio"
              name={groupName}
              value={option.id ?? NO_ROLE}
              checked={currentRoleId === option.id}
              disabled={!hydrated || !onSaveRoles}
              onChange={() => {
                // The checked state stays controlled by the saved role: the new choice only
                // shows once the dialog has confirmed it, and cancelling leaves it untouched.
                setPendingRole(option.role)
              }}
              aria-haspopup={onSaveRoles ? 'dialog' : undefined}
              aria-label={t('option', { role: option.name, name: user.name, email: user.email })}
              aria-describedby={option.id === null ? noRoleDescribedBy : undefined}
            />
          </label>
        </td>
      ))}
    </tr>
  )
}
