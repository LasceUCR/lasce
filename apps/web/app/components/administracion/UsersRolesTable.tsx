import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'

import styles from './UsersRolesTable.module.css'
import { UserRolesRow } from './UserRolesRow'
import type { UserRolesRowProps } from './UserRolesRow'

export interface UsersRolesTableProps {
  currentUserId?: string
  users: OverviewUser[]
  roles: OverviewRole[]
  describedBy?: string
  onUserSelect?: (user: OverviewUser) => void
  onSaveRoles?: UserRolesRowProps['onSaveRoles']
  visibleUserIds?: string[]
}

export function UsersRolesTable({
  users,
  roles,
  describedBy,
  onUserSelect,
  onSaveRoles,
  visibleUserIds,
  currentUserId,
}: UsersRolesTableProps) {
  return (
    <div
      className={styles.scroll}
      role="region"
      aria-label="Tabla de usuarios y roles"
      tabIndex={0}
      hidden={visibleUserIds?.length === 0}
    >
      <table className={styles.table} aria-label="Usuarios y roles" aria-describedby={describedBy}>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Correo electrónico</th>
            {roles.map((role) => (
              <th scope="col" key={role.id} className={styles.assignment}>
                {role.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserRolesRow
              isCurrentUser={currentUserId === user.id}
              key={user.id}
              user={user}
              roles={roles}
              onUserSelect={onUserSelect}
              onSaveRoles={onSaveRoles}
              hidden={visibleUserIds ? !visibleUserIds.includes(user.id) : false}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
