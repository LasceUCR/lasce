'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'
import { RoleAssignmentError } from '@/app/lib/user-overview'
import type { RoleChangeResult } from '@/app/lib/user-administration'
import { UsersOverviewPage } from './UsersOverviewPage'

export interface UserRoleAssignmentProps {
  currentUserId: string
  title: string
  description: string
  users: OverviewUser[]
  roles: OverviewRole[]
  saveAction: (input: {
    userId: string
    roleIds: string[]
    previousRoleIds: string[]
  }) => Promise<RoleChangeResult>
}

export function UserRoleAssignment({
  users: initialUsers,
  saveAction,
  currentUserId,
  ...props
}: UserRoleAssignmentProps) {
  const [users, setUsers] = useState(initialUsers)
  const router = useRouter()

  async function save(userId: string, roleIds: string[]) {
    const previousRoleIds = users.find((user) => user.id === userId)?.roleIds ?? []
    const result = await saveAction({ userId, roleIds, previousRoleIds })
    if (!result.ok) {
      if (result.reason === 'conflict') {
        throw new RoleAssignmentError(
          'La información de este usuario cambió. Recarga la página para ver sus roles actuales antes de volver a intentarlo.',
          true,
        )
      }
      if (result.reason === 'unauthorized') {
        throw new RoleAssignmentError(
          'Tu sesión terminó o ya no tienes autorización para cambiar roles. Recarga la página para comprobar tu acceso.',
          true,
        )
      }
      throw new RoleAssignmentError(
        'No pudimos confirmar el cambio. Recarga la página para comprobar el rol actual antes de volver a intentarlo.',
        true,
      )
    }
    setUsers((current) =>
      current.map((user) => (user.id === userId ? { ...user, roleIds: result.roleIds } : user)),
    )
    // Re-check the page gate after changing our own role. Other saves preserve
    // the active search, confirmation feedback and keyboard focus.
    if (userId === currentUserId) router.refresh()
  }

  return (
    <UsersOverviewPage {...props} currentUserId={currentUserId} users={users} onSaveRoles={save} />
  )
}
