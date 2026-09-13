'use client'

import { useState } from 'react'
import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'
import { UserRoleChangeDialog } from './UserRoleChangeDialog'
import styles from './UsersRolesTable.module.css'

export interface UserRolesRowProps {
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
}: UserRolesRowProps) {
  // Undefined means closed; null means confirmation to remove the current role.
  const [pendingRole, setPendingRole] = useState<OverviewRole | null | undefined>(undefined)
  const [feedback, setFeedback] = useState('')

  async function confirm() {
    if (!onSaveRoles || pendingRole === undefined) return
    await onSaveRoles(user.id, pendingRole ? [pendingRole.id] : [])
    setFeedback(
      pendingRole
        ? `Rol actualizado para ${user.name}: ${pendingRole.name}.`
        : `Rol retirado de ${user.name}.`,
    )
    setPendingRole(undefined)
  }

  return (
    <tr hidden={hidden}>
      <th scope="row">
        {onUserSelect ? (
          <button
            type="button"
            className={styles.userName}
            aria-haspopup="dialog"
            onClick={() => onUserSelect(user)}
          >
            {user.name}
          </button>
        ) : (
          user.name
        )}
        {feedback && (
          <p role="status" className={styles.feedback}>
            {feedback}
          </p>
        )}
        {pendingRole !== undefined && (
          <UserRoleChangeDialog
            user={user}
            currentRoles={roles.filter((role) => user.roleIds.includes(role.id))}
            role={pendingRole}
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
              disabled={!onSaveRoles}
              onChange={() => {
                setFeedback('')
                setPendingRole(user.roleIds.includes(role.id) ? null : role)
              }}
              aria-haspopup={onSaveRoles ? 'dialog' : undefined}
              aria-label={`${role.name}: ${user.name} (${user.email})`}
            />
          </label>
        </td>
      ))}
    </tr>
  )
}
