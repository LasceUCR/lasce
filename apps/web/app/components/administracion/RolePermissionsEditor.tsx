'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFormatter, useMessages, useTranslations } from 'next-intl'
import type { UserRole } from '@lasce/db'

import { useToast } from '@/app/components/public/toast/ToastProvider'
import { permissionRows } from '@/app/lib/access-messages'
import type { Permission } from '@/app/lib/auth/permissions'
import { isRolePermissionsLocked, PERMISSIONS, sortPermissions } from '@/app/lib/auth/permissions'
import type { PermissionChangeResult, RolePermissionMap } from '@/app/lib/role-permissions'
import { RoleAssignmentError, type OverviewRole } from '@/app/lib/user-overview'

import { UserRoleChangeDialog } from './UserRoleChangeDialog'
import { RolePermissionsPage } from './RolePermissionsPage'

export interface RolePermissionsEditorProps {
  title: string
  description: string
  /** Already named in the site's language (`roleName`). */
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
  const t = useTranslations('administration.permissions')
  const format = useFormatter()
  const messages = useMessages()
  const toast = useToast()
  // The error toast of the previous attempt, dismissed when the next one starts.
  const errorToast = useRef<number | null>(null)
  // Focus goes back to the table after the confirmation closes or the draft is discarded: the
  // button that was used is disabled by then, so focus would otherwise fall to the page itself.
  const tableRegion = useRef<HTMLDivElement>(null)
  const [focusRequests, setFocusRequests] = useState(0)

  useEffect(() => {
    if (focusRequests > 0) tableRegion.current?.focus()
  }, [focusRequests])

  function returnFocusToTable() {
    setFocusRequests((count) => count + 1)
  }

  const lockedRoleIds = roles
    .filter((role) => isUserRole(role.id) && isRolePermissionsLocked(role.id))
    .map((role) => role.id)
  const dirtyRoles = (Object.keys(draft) as UserRole[]).filter(
    (role) => !isRolePermissionsLocked(role) && !sameSet(draft[role], matrix[role]),
  )
  const canSave = dirtyRoles.length > 0
  const pending = pendingGrantDiff(draft, matrix)

  // Identifiers stay the keys; only the text shown comes from the catalogue.
  const permissions = useMemo(() => permissionRows(messages), [messages])

  function roleNameOf(role: UserRole): string {
    return roles.find((item) => item.id === role)?.name ?? role
  }

  /** "Visitante y Asistente", "Visitor and Assistant": a list in the site's language. */
  function listRoles(names: string[]): string {
    return format.list(names, { type: 'conjunction' })
  }

  function showError(message: string) {
    errorToast.current = toast.show('error', message)
  }

  function togglePermission(roleId: string, permission: Permission) {
    if (!isUserRole(roleId) || isRolePermissionsLocked(roleId)) return
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
    returnFocusToTable()
  }

  function requestSave() {
    if (saving || !canSave) return
    setConfirming(true)
  }

  async function persist() {
    if (saving || !canSave) return
    setSaving(true)
    if (errorToast.current !== null) toast.dismiss(errorToast.current)
    errorToast.current = null
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
          // A failure without a reason is a server error: the fallback says to reload and check.
          const reason = result.reason ?? 'unknown'
          throw new RoleAssignmentError(t(`errors.${reason}`), true)
        }
        nextMatrix = { ...nextMatrix, [role]: result.permissions }
        updated.push(roleNameOf(role))
      }
      setMatrix(nextMatrix)
      setDraft(nextMatrix)
      // Close first, so the success toast shows on the page rather than in a closing dialog.
      setConfirming(false)
      returnFocusToTable()
      toast.show('success', t('updated', { roles: listRoles(updated) }))
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
        saving={saving}
        confirming={confirming}
        canSave={canSave}
        pendingChanges={saving || confirming ? 0 : pending.count}
        dirtyPermissionIds={pending.dirtyPermissionIds}
        tableRegionRef={tableRegion}
      />
      {confirming ? (
        <UserRoleChangeDialog
          roleNames={dirtyRoles.map(roleNameOf)}
          permissionsCopy={{
            title: t('dialog.title'),
            question: t.rich('dialog.question', {
              roles: listRoles(dirtyRoles.map(roleNameOf)),
              strong: (chunks) => <strong>{chunks}</strong>,
            }),
            summary: t('dialog.summary'),
            confirm: t('dialog.confirm'),
            cancel: t('dialog.cancel'),
            savingStatus: t('dialog.savingStatus'),
            savingButton: t('dialog.savingButton'),
            reload: t('dialog.reload'),
            unknownError: t('errors.unknown'),
          }}
          onError={showError}
          onConfirm={persist}
          onClose={() => {
            setConfirming(false)
            returnFocusToTable()
          }}
        />
      ) : null}
    </>
  )
}
