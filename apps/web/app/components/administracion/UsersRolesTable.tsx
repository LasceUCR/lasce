import { useTranslations } from 'next-intl'

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
  const t = useTranslations('administration.users.table')

  return (
    <div
      className={styles.scroll}
      role="region"
      aria-label={t('region')}
      tabIndex={0}
      hidden={visibleUserIds?.length === 0}
    >
      <table className={styles.table} aria-label={t('label')} aria-describedby={describedBy}>
        <thead>
          <tr>
            <th scope="col">{t('name')}</th>
            <th scope="col">{t('email')}</th>
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
