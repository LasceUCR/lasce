'use client'

import { AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button, type ButtonVariant } from './Button'
import { Modal, type ModalSize } from './Modal'
import styles from './StandardConfirmDialog.module.css'

export type ConfirmationSeverity = 'danger' | 'warning' | 'info'

export interface StandardConfirmDialogProps {
  open: boolean
  title: string
  message: string
  /** Explains critical consequences (e.g., "Esta acción no se puede deshacer"). */
  consequence?: string
  /** Highlights the specific entity name being modified or deleted. */
  targetEntity?: string
  confirmLabel?: string
  cancelLabel?: string
  severity?: ConfirmationSeverity
  /** Custom override for the confirm button variant. Defaults according to severity. */
  confirmVariant?: ButtonVariant
  /** When true, buttons are disabled and confirm button shows a loading spinner. */
  isSubmitting?: boolean
  submittingLabel?: string
  /** Inline error message if the action failed. */
  errorMessage?: string | null
  size?: ModalSize
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  children?: ReactNode
}

function resolveIcon(severity: ConfirmationSeverity) {
  switch (severity) {
    case 'danger':
      return <AlertTriangle aria-hidden="true" size={24} strokeWidth={2} />
    case 'warning':
      return <AlertCircle aria-hidden="true" size={24} strokeWidth={2} />
    case 'info':
    default:
      return <Info aria-hidden="true" size={24} strokeWidth={2} />
  }
}

function resolveIconClass(severity: ConfirmationSeverity) {
  switch (severity) {
    case 'danger':
      return styles.iconDanger
    case 'warning':
      return styles.iconWarning
    case 'info':
    default:
      return styles.iconInfo
  }
}

function resolveConsequenceClass(severity: ConfirmationSeverity) {
  switch (severity) {
    case 'danger':
      return styles.consequenceDanger
    case 'warning':
      return styles.consequenceWarning
    case 'info':
    default:
      return styles.consequenceInfo
  }
}

function resolveDefaultConfirmVariant(severity: ConfirmationSeverity): ButtonVariant {
  switch (severity) {
    case 'danger':
      return 'danger'
    case 'warning':
    case 'info':
    default:
      return 'primary'
  }
}

/**
 * Standardized confirmation modal for management actions in LASCE.
 * Provides clear visual hierarchy for destructive (danger), caution (warning),
 * and standard (info) operations, with native support for target entity previews,
 * consequence warnings, and asynchronous loading states.
 */
export function StandardConfirmDialog({
  open,
  title,
  message,
  consequence,
  targetEntity,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  severity = 'info',
  confirmVariant,
  isSubmitting = false,
  submittingLabel = 'Procesando...',
  errorMessage,
  size = 'small',
  onConfirm,
  onCancel,
  children,
}: StandardConfirmDialogProps) {
  const icon = resolveIcon(severity)
  const iconClass = resolveIconClass(severity)
  const consequenceClass = resolveConsequenceClass(severity)
  const effectiveConfirmVariant = confirmVariant ?? resolveDefaultConfirmVariant(severity)

  return (
    <Modal onClose={isSubmitting ? () => {} : onCancel} open={open} size={size} title={title}>
      <div className={styles.dialogContent}>
        <div className={styles.headerRow}>
          <div className={`${styles.iconContainer} ${iconClass}`}>{icon}</div>
          <div className={styles.textContent}>
            <p className={styles.message}>{message}</p>
          </div>
        </div>

        {targetEntity ? (
          <div
            className={`${styles.targetEntityCard} ${
              severity === 'danger' ? styles.targetEntityCardDanger : ''
            }`}
          >
            <strong>Elemento: </strong>
            <span>{targetEntity}</span>
          </div>
        ) : null}

        {consequence ? (
          <div className={`${styles.consequenceBox} ${consequenceClass}`} role="note">
            <span>{consequence}</span>
          </div>
        ) : null}

        {errorMessage ? (
          <p className={styles.errorMessage} role="alert">
            {errorMessage}
          </p>
        ) : null}

        {children}

        <div className={styles.actions}>
          <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button disabled={isSubmitting} onClick={onConfirm} variant={effectiveConfirmVariant}>
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" className={styles.spinner} size={16} />
                <span>{submittingLabel}</span>
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
