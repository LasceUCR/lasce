'use client'

import { useRef, useState } from 'react'
import { demoRoles, demoUsers } from '@/app/lib/user-overview-demo'
import { UsersOverviewPage } from './UsersOverviewPage'

export interface UserRoleAssignmentDemoProps {
  title: string
  description: string
  /** Storybook-only failure simulation; never changes persisted data. */
  simulateFailure?: boolean
}

export function UserRoleAssignmentDemo({
  title,
  description,
  simulateFailure = false,
}: UserRoleAssignmentDemoProps) {
  const [users, setUsers] = useState(demoUsers)
  const pendingUsers = useRef(new Set<string>())

  async function saveRoles(userId: string, roleIds: string[]) {
    if (roleIds.length > 1 || roleIds.some((id) => !demoRoles.some((role) => role.id === id))) {
      throw new Error('Expected at most one available role')
    }
    if (pendingUsers.current.has(userId)) throw new Error('A save is already pending')
    pendingUsers.current.add(userId)
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 600))
      if (simulateFailure) throw new Error('Simulated role assignment failure')
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, roleIds: [...roleIds] } : user)),
      )
    } finally {
      pendingUsers.current.delete(userId)
    }
  }

  return (
    <UsersOverviewPage
      title={title}
      description={description}
      users={users}
      roles={demoRoles}
      isDemo
      onSaveRoles={saveRoles}
    />
  )
}
