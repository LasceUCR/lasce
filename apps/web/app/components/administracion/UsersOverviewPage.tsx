'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { SearchBar } from '@/app/components/public/SearchBar'

import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'

import { UsersRolesTable } from './UsersRolesTable'
import type { UserRolesRowProps } from './UserRolesRow'
import { UserDetailsDialog } from './UserDetailsDialog'
import styles from './UsersOverviewPage.module.css'

export interface UsersOverviewPageProps {
  currentUserId?: string
  title: string
  description: string
  users: OverviewUser[]
  roles: OverviewRole[]
  isDemo?: boolean
  onSaveRoles?: UserRolesRowProps['onSaveRoles']
}

export function UsersOverviewPage({
  title,
  description,
  users,
  roles,
  isDemo = false,
  onSaveRoles,
  currentUserId,
}: UsersOverviewPageProps) {
  const t = useTranslations('administration.users')
  const searchRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const selectedUser = users.find((user) => user.id === selectedUserId)
  const search = query.trim().toLowerCase()
  const filteredUsers = users.filter(
    (user) => user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search),
  )

  return (
    <div>
      <div className="section-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <section className="surface-card admin-panel" aria-labelledby="users-overview-title">
        <h2 id="users-overview-title">{t('panelTitle')}</h2>
        {isDemo && <p className={styles.notice}>{t('demoNotice')}</p>}
        <p id="users-overview-help" className={styles.help}>
          {onSaveRoles ? t('helpEditable') : t('helpReadOnly')}
        </p>
        {isDemo && onSaveRoles && <p className={styles.help}>{t('demoChanges')}</p>}
        {roles.length === 0 && <p>{t('noRoles')}</p>}
        <div ref={searchRef} className={styles.searchControls}>
          <SearchBar
            label={t('search.label')}
            placeholder={t('search.placeholder')}
            query={query}
            onQueryChange={setQuery}
          />
          {query !== '' && (
            <Button
              variant="secondary"
              className={styles.clearSearch}
              type="button"
              onClick={() => {
                setQuery('')
                searchRef.current?.querySelector('input')?.focus()
              }}
            >
              {t('search.clear')}
            </Button>
          )}
        </div>
        <p className={query.trim() ? 'content-empty' : 'sr-only'} role="status" aria-atomic="true">
          {users.length > 0 && query.trim() !== ''
            ? filteredUsers.length === 0
              ? t('noResults', { query: query.trim() })
              : t('results', { count: filteredUsers.length })
            : ''}
        </p>
        {users.length === 0 ? (
          <p className="content-empty">{t('empty')}</p>
        ) : (
          <UsersRolesTable
            currentUserId={currentUserId}
            users={onSaveRoles ? users : filteredUsers}
            visibleUserIds={onSaveRoles ? filteredUsers.map((user) => user.id) : undefined}
            roles={roles}
            describedBy="users-overview-help"
            onUserSelect={(user) => setSelectedUserId(user.id)}
            onSaveRoles={onSaveRoles}
          />
        )}
      </section>
      {selectedUser && (
        <UserDetailsDialog user={selectedUser} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  )
}
