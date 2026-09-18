'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/app/components/public/Button'
import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'
import { RoleAssignmentError } from '@/app/lib/user-overview'
import styles from './UserRoleChangeDialog.module.css'

export interface UserRoleChangeDialogProps {
  isCurrentUser?: boolean
  user?: OverviewUser
  currentRoles?: OverviewRole[]
  role?: OverviewRole | null
  roleNames?: string[]
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
        title: 'Confirmar cambio de permisos',
        confirm: 'Sí, guardar permisos',
        saving: 'Guardando cambio de permisos…',
        unknownError:
          'No pudimos confirmar el cambio. Recarga la página para comprobar los permisos actuales antes de volver a intentarlo.',
      }
    : {
        title: role ? 'Confirmar cambio de rol' : 'Confirmar retiro de rol',
        confirm: role ? 'Sí, cambiar rol' : 'Sí, retirar rol',
        saving: 'Guardando cambio de rol…',
        unknownError:
          'No pudimos confirmar el cambio. Recarga la página para comprobar el rol actual antes de volver a intentarlo.',
      }

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

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
      setError(
        failure instanceof RoleAssignmentError
          ? failure
          : new RoleAssignmentError(copy.unknownError, true),
      )
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  let body: ReactNode
  if (permissionsMode) {
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
      {error && (
        <p role="alert" tabIndex={-1} ref={errorRef} className={styles.error}>
          {error.message}
        </p>
      )}
      {saving && <p role="status">{copy.saving}</p>}
      <div ref={cancelRef} className={styles.actions}>
        {error?.reloadRequired && (
          <Button variant="brand" onClick={() => window.location.reload()}>
            Recargar página
          </Button>
        )}
        <Button variant="secondary" disabled={saving} onClick={onClose}>
          No, cancelar
        </Button>
        <Button
          className={styles.confirm}
          disabled={saving || Boolean(error?.reloadRequired)}
          onClick={() => {
            void confirm()
          }}
        >
          {saving ? 'Guardando…' : copy.confirm}
        </Button>
      </div>
    </dialog>
  )
}
