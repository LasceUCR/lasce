'use client'

import { useRef, useState } from 'react'

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
        <h2 id="users-overview-title">Usuarios y roles</h2>
        {isDemo && (
          <p className={styles.notice}>
            Datos de prueba: los usuarios y roles mostrados son ficticios.
          </p>
        )}
        <p id="users-overview-help" className={styles.help}>
          {onSaveRoles
            ? 'Cada usuario puede tener un solo rol. Selecciona otro para cambiarlo o pulsa el rol actual para retirarlo. Se pedirá confirmación antes de aplicar el cambio.'
            : 'Solo consulta. Las casillas indican los roles asignados y no permiten modificarlos.'}
        </p>
        {isDemo && onSaveRoles && (
          <p className={styles.help}>
            Los cambios son de prueba y se pierden al recargar la página.
          </p>
        )}
        {roles.length === 0 && <p>No hay roles disponibles para mostrar.</p>}
        <div ref={searchRef} className={styles.searchControls}>
          <SearchBar
            label="Buscar usuarios"
            placeholder="Buscar por nombre o correo electrónico..."
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
              Limpiar búsqueda
            </Button>
          )}
        </div>
        <p className={query.trim() ? 'content-empty' : 'sr-only'} role="status" aria-atomic="true">
          {users.length > 0 && query.trim() !== ''
            ? filteredUsers.length === 0
              ? `No se encontraron usuarios para “${query.trim()}”.`
              : `${filteredUsers.length} ${filteredUsers.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}.`
            : ''}
        </p>
        {users.length === 0 ? (
          <p className="content-empty">No hay usuarios para mostrar.</p>
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
