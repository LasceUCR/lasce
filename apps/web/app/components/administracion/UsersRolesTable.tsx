import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'

import styles from './UsersRolesTable.module.css'

export interface UsersRolesTableProps {
  users: OverviewUser[]
  roles: OverviewRole[]
  describedBy?: string
  onUserSelect?: (user: OverviewUser) => void
}

export function UsersRolesTable({ users, roles, describedBy, onUserSelect }: UsersRolesTableProps) {
  return (
    <div
      className={styles.scroll}
      role="region"
      aria-label="Tabla de usuarios y roles"
      tabIndex={0}
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
            <tr key={user.id}>
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
              </th>
              <td>{user.email}</td>
              {roles.map((role) => (
                <td key={role.id} className={styles.assignment}>
                  <input
                    type="checkbox"
                    checked={user.roleIds.includes(role.id)}
                    disabled
                    aria-label={`${role.name}: ${user.name} (${user.email})`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
