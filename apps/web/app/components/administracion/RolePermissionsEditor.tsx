'use client'

import { useMemo, useState } from 'react'
import type { UserRole } from '@lasce/db'

import type { Permission } from '@/app/lib/auth/permissions'
import {
  lockedPermissionsForRole,
  PERMISSION_DESCRIPTIONS,
  PERMISSION_LABELS,
  PERMISSIONS,
  sortPermissions,
} from '@/app/lib/auth/permissions'
import type { PermissionChangeResult, RolePermissionMap } from '@/app/lib/role-permissions'
import type { OverviewRole } from '@/app/lib/user-overview'

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

export function RolePermissionsEditor({
  title,
  description,
  roles,
  matrix: initialMatrix,
  saveAction,
}: RolePermissionsEditorProps) {
  const [matrix, setMatrix] = useState(initialMatrix)
  const [selectedRoleId, setSelectedRoleId] = useState<UserRole>('ADMIN')
  const [draft, setDraft] = useState<Permission[]>(initialMatrix.ADMIN)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const selectedRole = roles.find((role) => role.id === selectedRoleId)
  const locked = lockedPermissionsForRole(selectedRoleId)
  const saved = matrix[selectedRoleId]
  const canSave = sortPermissions(draft).join() !== sortPermissions(saved).join()

  const permissions = useMemo(
    () =>
      PERMISSIONS.map((id) => ({
        id,
        label: PERMISSION_LABELS[id],
        description: PERMISSION_DESCRIPTIONS[id],
        checked: draft.includes(id),
        locked: locked.includes(id),
      })),
    [draft, locked],
  )

  function selectRole(roleId: string) {
    if (!isUserRole(roleId)) return
    setSelectedRoleId(roleId)
    setDraft(matrix[roleId])
    setError('')
    setStatus('')
  }

  function togglePermission(permission: Permission) {
    if (locked.includes(permission)) return
    setStatus('')
    setError('')
    setDraft((current) =>
      current.includes(permission)
        ? current.filter((id) => id !== permission)
        : [...current, permission],
    )
  }

  async function save() {
    if (saving || !canSave) return
    setSaving(true)
    setError('')
    setStatus('')
    const result = await saveAction({
      role: selectedRoleId,
      permissions: draft,
      previousPermissions: saved,
    })
    setSaving(false)
    if (!result.ok) {
      if (result.reason === 'unauthorized') {
        setError(
          'Tu sesión terminó o ya no tienes autorización para configurar permisos. Recarga la página para comprobar tu acceso.',
        )
        return
      }
      if (result.reason === 'locked') {
        setError('El rol de administración debe conservar el permiso para configurar permisos.')
        return
      }
      setError('La información de este rol cambió. Recarga la página antes de volver a guardarlo.')
      return
    }
    setMatrix((current) => ({ ...current, [selectedRoleId]: result.permissions }))
    setDraft(result.permissions)
    setStatus(`Permisos actualizados para ${selectedRole?.name ?? selectedRoleId}.`)
  }

  return (
    <RolePermissionsPage
      title={title}
      description={description}
      roles={roles}
      selectedRoleId={selectedRoleId}
      onSelectRole={selectRole}
      permissions={permissions}
      onTogglePermission={togglePermission}
      onSave={save}
      saving={saving}
      canSave={canSave}
      error={error}
      status={status}
    />
  )
}
