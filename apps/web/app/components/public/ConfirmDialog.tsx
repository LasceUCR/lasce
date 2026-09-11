'use client'

import { Button, type ButtonVariant } from './Button'
import { Modal } from './Modal'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' for a destructive action like deleting, 'primary' otherwise. */
  confirmVariant?: ButtonVariant
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onCancel} open={open} title={title}>
      <p>{message}</p>
      <div className="modal-actions">
        <Button onClick={onCancel} variant="secondary">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} variant={confirmVariant}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
