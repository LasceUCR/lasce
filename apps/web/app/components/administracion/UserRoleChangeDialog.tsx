'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/app/components/public/Button'
import { ToastOutlet } from '@/app/components/public/toast/ToastOutlet'
import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'
import { RoleAssignmentError } from '@/app/lib/user-overview'
import styles from './UserRoleChangeDialog.module.css'

/**
 * The text of the permissions confirmation, already in the site's language. Built by
 * `RolePermissionsEditor` from `administration.permissions.dialog`; without it the dialog keeps
 * its Spanish text, which the user-role flow of `/administracion/usuarios` still uses.
 */
export interface PermissionsDialogCopy {
  title: string
  /** The question, naming the roles (formatted as a list in the site's language). */
  question: ReactNode
  summary: string
  confirm: string
  cancel: string
  savingStatus: string
  savingButton: string
  reload: string
  unknownError: string
}

export interface UserRoleChangeDialogProps {
  isCurrentUser?: boolean
  user?: OverviewUser
  currentRoles?: OverviewRole[]
  role?: OverviewRole | null
  roleNames?: string[]
  /** Permissions mode only: replaces the Spanish text. */
  permissionsCopy?: PermissionsDialogCopy
  /**
   * When given, a failure is reported through it (as a toast) instead of as text inside the
   * dialog; the dialog then hosts the toasts, so they are not inert behind it. Either way the
   * dialog stays open, and a failure that needs a reload offers one.
   */
  onError?: (message: string) => void
  onConfirm: () => Promise<void>
  onClose: () => void
}

function formatRoleNames(names: string[]): string {
  return new Intl.ListFormat('es', { style: 'long', type: 'conjunction' }).format(names)
}

export function UserRoleChangeDialog({
  user,
  currentRoles = [],
  role = null,
  roleNames,
  permissionsCopy,
  onError,
  onConfirm,
  onClose,
  isCurrentUser = false,
}: UserRoleChangeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLDivElement>(null)
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<RoleAssignmentError | null>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const permissionsMode = roleNames !== undefined
  const copy = permissionsMode
    ? {
        title: permissionsCopy?.title ?? 'Confirmar cambio de permisos',
        confirm: permissionsCopy?.confirm ?? 'Sí, guardar permisos',
        saving: permissionsCopy?.savingStatus ?? 'Guardando cambio de permisos…',
        unknownError:
          permissionsCopy?.unknownError ??
          'No pudimos confirmar el cambio. Recarga la página para comprobar los permisos actuales antes de volver a intentarlo.',
      }
    : {
        title: role ? 'Confirmar cambio de rol' : 'Confirmar retiro de rol',
        confirm: role ? 'Sí, cambiar rol' : 'Sí, retirar rol',
        saving: 'Guardando cambio de rol…',
        unknownError:
          'No pudimos confirmar el cambio. Recarga la página para comprobar el rol actual antes de volver a intentarlo.',
      }
  const cancelLabel = permissionsCopy?.cancel ?? 'No, cancelar'
  const savingButtonLabel = permissionsCopy?.savingButton ?? 'Guardando…'
  const reloadLabel = permissionsCopy?.reload ?? 'Recargar página'

  useEffect(() => {
    if (error && !onError) errorRef.current?.focus()
  }, [error, onError])

  useEffect(() => {
    const dialog = dialogRef.current!
    const trigger = document.activeElement
    dialog.showModal()
    cancelRef.current?.querySelector('button')?.focus()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  async function confirm() {
    if (savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setError(null)
    try {
      await onConfirm()
    } catch (failure) {
      const reported =
        failure instanceof RoleAssignmentError
          ? failure
          : new RoleAssignmentError(copy.unknownError, true)
      setError(reported)
      onError?.(reported.message)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  let body: ReactNode
  if (permissionsMode && permissionsCopy) {
    body = (
      <>
        <p id={descriptionId}>{permissionsCopy.question}</p>
        <p className={styles.summary}>{permissionsCopy.summary}</p>
      </>
    )
  } else if (permissionsMode) {
    body = (
      <>
        <p id={descriptionId}>
          ¿Quieres guardar los permisos de <strong>{formatRoleNames(roleNames)}</strong>?
        </p>
        <p className={styles.summary}>
          El cambio se aplica de inmediato a las cuentas con ese rol. No hace falta que vuelvan a
          iniciar sesión.
        </p>
      </>
    )
  } else {
    body = (
      <>
        <p id={descriptionId}>
          {role ? (
            <>
              ¿Quieres asignar el rol <strong>{role.name}</strong> a <strong>{user?.name}</strong>?
            </>
          ) : (
            <>
              ¿Quieres retirar el rol de <strong>{user?.name}</strong>?
            </>
          )}
        </p>
        <p className={styles.current}>
          Rol actual: {currentRoles.map((entry) => entry.name).join(', ') || 'Sin rol'}
        </p>
        {isCurrentUser && (
          <p className={styles.summary}>
            Estás modificando tu propio rol. Al dejar de ser administrador perderás el acceso a esta
            pantalla.
          </p>
        )}
        {role?.description ? (
          <div className={styles.summary}>
            <h3>{role.name}</h3>
            <p>{role.description}</p>
          </div>
        ) : !role ? (
          <p>El usuario quedará sin un rol asignado.</p>
        ) : null}
        {role && currentRoles.length > 0 && (
          <p>El nuevo rol reemplazará al actual. El usuario no conservará ambos roles.</p>
        )}
      </>
    )
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault()
        if (!savingRef.current) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const buttons =
          dialogRef.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        if (!buttons.length) {
          event.preventDefault()
          return
        }
        const first = buttons[0]!
        const last = buttons[buttons.length - 1]!
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
    >
      <h2 id={titleId}>{copy.title}</h2>
      {body}
      {error && !onError && (
        <p role="alert" tabIndex={-1} ref={errorRef} className={styles.error}>
          {error.message}
        </p>
      )}
      {saving && <p role="status">{copy.saving}</p>}
      <div ref={cancelRef} className={styles.actions}>
        {error?.reloadRequired && (
          <Button variant="brand" onClick={() => window.location.reload()}>
            {reloadLabel}
          </Button>
        )}
        <Button variant="secondary" disabled={saving} onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          className={styles.confirm}
          disabled={saving || Boolean(error?.reloadRequired)}
          onClick={() => {
            void confirm()
          }}
        >
          {saving ? savingButtonLabel : copy.confirm}
        </Button>
      </div>
      {onError ? <ToastOutlet /> : null}
    </dialog>
  )
}
