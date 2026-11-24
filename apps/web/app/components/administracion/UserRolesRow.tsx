'use client'

import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
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
const ARROW_STEPS: Record<string, number> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
}

/**
 * Moves focus to the previous or next option of the row without checking it. A native radio
 * group would check each option it reaches, and every check here opens a confirmation dialog,
 * so the arrow keys only browse; Space or a click chooses.
 */
function moveFocus(event: KeyboardEvent<HTMLInputElement>) {
  const step = ARROW_STEPS[event.key]
  if (!step || event.altKey || event.ctrlKey || event.metaKey) return
  event.preventDefault()
  const current = event.currentTarget
  const group = Array.from(
    current.closest('tr')?.querySelectorAll<HTMLInputElement>('input[type="radio"]') ?? [],
  ).filter((input) => input.name === current.name && !input.disabled)
  const index = group.indexOf(current)
  group[(index + step + group.length) % group.length]?.focus()
}

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
  // One radio group per row: the browser keeps a single option checked, and the arrow keys
  // move between the options (see `moveFocus`).
  const groupName = `role-${useId()}`
  // A role missing from `roles` leaves every option unchecked rather than claiming "Sin rol".
  const currentRoleId = user.roleIds[0] ?? null
  // With no role to offer there is nothing to choose, "Sin rol" included.
  const options: RoleOption[] =
    roles.length === 0
      ? []
      : [
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
              onKeyDown={moveFocus}
              // The selected option changes nothing when chosen again, so it opens no dialog.
              aria-haspopup={onSaveRoles && currentRoleId !== option.id ? 'dialog' : undefined}
              aria-label={t('option', { role: option.name, name: user.name, email: user.email })}
              aria-describedby={option.id === null ? noRoleDescribedBy : undefined}
            />
          </label>
        </td>
      ))}
    </tr>
  )
}
