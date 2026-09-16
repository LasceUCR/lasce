'use client'

import { useMemo, useState } from 'react'
import type { UserRole } from '@lasce/db'

import type { Permission } from '@/app/lib/auth/permissions'
import {
  isRolePermissionsLocked,
  PERMISSION_LABELS,
  PERMISSIONS,
  sortPermissions,
} from '@/app/lib/auth/permissions'
import type { PermissionChangeResult, RolePermissionMap } from '@/app/lib/role-permissions'
import { RoleAssignmentError, type OverviewRole } from '@/app/lib/user-overview'

import { UserRoleChangeDialog } from './UserRoleChangeDialog'
import { RolePermissionsPage } from './RolePermissionsPage'

export interface RolePermissionsEditorProps {
  title: string
  description: string
  roles: OverviewRole[]
  matrix: RolePermissionMap
  saveAction: (input: {
    role: UserRole
    permissions: Permission[]
    previousPermissions: Permission[]
  }) => Promise<PermissionChangeResult>
}

function isUserRole(value: string): value is UserRole {
  return value === 'VISITOR' || value === 'ASSISTANT' || value === 'ADMIN'
}

function sameSet(left: readonly Permission[], right: readonly Permission[]): boolean {
  return sortPermissions(left).join() === sortPermissions(right).join()
}

function pendingGrantDiff(draft: RolePermissionMap, saved: RolePermissionMap) {
  const dirty = new Set<Permission>()
  let count = 0
  for (const role of Object.keys(draft) as UserRole[]) {
    if (isRolePermissionsLocked(role)) continue
    for (const permission of PERMISSIONS) {
      if (draft[role].includes(permission) === saved[role].includes(permission)) continue
      count += 1
      dirty.add(permission)
    }
  }
  return {
    count,
    dirtyPermissionIds: PERMISSIONS.filter((id) => dirty.has(id)),
  }
}

export function RolePermissionsEditor({
  title,
  description,
  roles,
  matrix: initialMatrix,
  saveAction,
}: RolePermissionsEditorProps) {
  const [matrix, setMatrix] = useState(initialMatrix)
  const [draft, setDraft] = useState<RolePermissionMap>(initialMatrix)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [status, setStatus] = useState('')

  const lockedRoleIds = roles
    .filter((role) => isUserRole(role.id) && isRolePermissionsLocked(role.id))
    .map((role) => role.id)
  const dirtyRoles = (Object.keys(draft) as UserRole[]).filter(
    (role) => !isRolePermissionsLocked(role) && !sameSet(draft[role], matrix[role]),
  )
  const canSave = dirtyRoles.length > 0
  const pending = pendingGrantDiff(draft, matrix)

  const permissions = useMemo(
    () =>
      PERMISSIONS.map((id) => ({
        id,
        label: PERMISSION_LABELS[id],
      })),
    [],
  )

  function togglePermission(roleId: string, permission: Permission) {
    if (!isUserRole(roleId) || isRolePermissionsLocked(roleId)) return
    setStatus('')
    setDraft((current) => {
      const granted = current[roleId]
      return {
        ...current,
        [roleId]: granted.includes(permission)
          ? granted.filter((id) => id !== permission)
          : [...granted, permission],
      }
    })
  }

  function discard() {
    if (saving || confirming || !canSave) return
    setDraft(matrix)
    setStatus('')
  }

  function requestSave() {
    if (saving || !canSave) return
    setStatus('')
    setConfirming(true)
  }

  async function persist() {
    if (saving || !canSave) return
    setSaving(true)
    setStatus('')
    let nextMatrix = matrix
    const updated: string[] = []
    try {
      for (const role of dirtyRoles) {
        const result = await saveAction({
          role,
          permissions: sortPermissions(draft[role]),
          previousPermissions: nextMatrix[role],
        })
        if (!result.ok) {
          if (result.reason === 'unauthorized') {
            throw new RoleAssignmentError(
              'Tu sesión terminó o ya no tienes autorización para configurar permisos. Recarga la página para comprobar tu acceso.',
              true,
            )
          }
          if (result.reason === 'locked') {
            throw new RoleAssignmentError(
              'Los permisos de la persona administradora no se pueden cambiar.',
              true,
            )
          }
          throw new RoleAssignmentError(
            'La información de este rol cambió. Recarga la página antes de volver a guardarlo.',
            true,
          )
        }
        nextMatrix = { ...nextMatrix, [role]: result.permissions }
        updated.push(roles.find((item) => item.id === role)?.name ?? role)
      }
      setMatrix(nextMatrix)
      setDraft(nextMatrix)
      setStatus(
        updated.length === 1
          ? `Permisos actualizados para ${updated[0]}.`
          : `Permisos actualizados para ${updated.join(' y ')}.`,
      )
      setConfirming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <RolePermissionsPage
        title={title}
        description={description}
        roles={roles}
        permissions={permissions}
        granted={draft}
        lockedRoleIds={lockedRoleIds}
        onTogglePermission={togglePermission}
        onSave={async () => {
          requestSave()
        }}
        onDiscard={discard}
        saving={saving || confirming}
        canSave={canSave}
        pendingChanges={pending.count}
        dirtyPermissionIds={pending.dirtyPermissionIds}
        status={status}
      />
      {confirming ? (
        <UserRoleChangeDialog
          roleNames={dirtyRoles.map((role) => roles.find((item) => item.id === role)?.name ?? role)}
          onConfirm={persist}
          onClose={() => setConfirming(false)}
        />
      ) : null}
    </>
  )
}
