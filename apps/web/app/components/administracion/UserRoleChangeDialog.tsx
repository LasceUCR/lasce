'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/app/components/public/Button'
import type { OverviewRole, OverviewUser } from '@/app/lib/user-overview'
import styles from './UserRoleChangeDialog.module.css'

export interface UserRoleChangeDialogProps {
  user: OverviewUser
  currentRoles: OverviewRole[]
  role: OverviewRole | null
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function UserRoleChangeDialog({
  user,
  currentRoles,
  role,
  onConfirm,
  onClose,
}: UserRoleChangeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLDivElement>(null)
  const savingRef = useRef(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

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
    setError(false)
    try {
      await onConfirm()
    } catch {
      setError(true)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
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
      <h2 id={titleId}>{role ? 'Confirmar cambio de rol' : 'Confirmar retiro de rol'}</h2>
      <p id={descriptionId}>
        {role ? (
          <>
            ¿Quieres asignar el rol <strong>{role.name}</strong> a <strong>{user.name}</strong>?
          </>
        ) : (
          <>
            ¿Quieres retirar el rol de <strong>{user.name}</strong>?
          </>
        )}
      </p>
      <p className={styles.current}>
        Rol actual: {currentRoles.map((entry) => entry.name).join(', ') || 'Sin rol'}
      </p>
      {role ? (
        <div className={styles.summary}>
          <h3>{role.name}</h3>
          <p>{role.description || 'No hay una descripción disponible para este rol.'}</p>
        </div>
      ) : (
        <p>El usuario quedará sin un rol asignado.</p>
      )}
      {role && currentRoles.length > 0 && (
        <p>El nuevo rol reemplazará al actual. El usuario no conservará ambos roles.</p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          No se pudo guardar el cambio. El rol anterior se mantiene. Puedes intentarlo de nuevo o
          cancelar.
        </p>
      )}
      {saving && <p role="status">Guardando cambio de rol…</p>}
      <div ref={cancelRef} className={styles.actions}>
        <Button variant="secondary" disabled={saving} onClick={onClose}>
          No, cancelar
        </Button>
        <Button
          className={styles.confirm}
          disabled={saving}
          onClick={() => {
            void confirm()
          }}
        >
          {saving ? 'Guardando…' : role ? 'Sí, cambiar rol' : 'Sí, retirar rol'}
        </Button>
      </div>
    </dialog>
  )
}
