'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/app/components/public/Button'
import type { OverviewUser } from '@/app/lib/user-overview'
import styles from './UserDetailsDialog.module.css'

export interface UserDetailsDialogProps {
  user: OverviewUser
  onClose: () => void
}

export function UserDetailsDialog({ user, onClose }: UserDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current!
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        // This read-only dialog has a single focusable control.
        if (event.key === 'Tab') event.preventDefault()
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className={styles.header}>
        <h2 id={titleId}>Información del usuario</h2>
        <Button variant="secondary" className={styles.close} onClick={onClose}>
          <X aria-hidden="true" size={22} />
          <span className="sr-only">Cerrar</span>
        </Button>
      </div>
      <dl className={styles.details}>
        <dt>Nombre completo</dt>
        <dd>{user.name}</dd>
        <dt>Correo electrónico</dt>
        <dd>{user.email}</dd>
        <dt>Institución</dt>
        <dd>{user.institution.trim() || 'No registrada'}</dd>
        <dt>País</dt>
        <dd>{user.country.trim() || 'No registrado'}</dd>
      </dl>
    </dialog>
  )
}
