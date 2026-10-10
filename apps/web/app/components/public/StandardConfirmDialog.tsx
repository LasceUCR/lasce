'use client'

import { AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button, type ButtonVariant } from './Button'
import { Modal, type ModalSize } from './Modal'

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
      return 'std-confirm-icon-danger'
    case 'warning':
      return 'std-confirm-icon-warning'
    case 'info':
    default:
      return 'std-confirm-icon-info'
  }
}

function resolveConsequenceClass(severity: ConfirmationSeverity) {
  switch (severity) {
    case 'danger':
      return 'std-confirm-consequence-danger'
    case 'warning':
      return 'std-confirm-consequence-warning'
    case 'info':
    default:
      return 'std-confirm-consequence-info'
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
      <div className="std-confirm-dialog">
        <div className="std-confirm-header">
          <div className={`std-confirm-icon ${iconClass}`}>{icon}</div>
          <div className="std-confirm-body">
            <p className="std-confirm-message">{message}</p>
          </div>
        </div>

        {targetEntity ? (
          <div
            className={`std-confirm-target-card ${
              severity === 'danger' ? 'std-confirm-target-card-danger' : ''
            }`}
          >
            <strong>Elemento: </strong>
            <span>{targetEntity}</span>
          </div>
        ) : null}

        {consequence ? (
          <div className={`std-confirm-consequence ${consequenceClass}`} role="note">
            <span>{consequence}</span>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="std-confirm-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {children}

        <div className="std-confirm-actions">
          <Button disabled={isSubmitting} onClick={onCancel} variant="secondary">
            {cancelLabel}
          </Button>
          <Button disabled={isSubmitting} onClick={onConfirm} variant={effectiveConfirmVariant}>
            {isSubmitting ? (
              <>
                <Loader2 aria-hidden="true" className="btn-spinner" size={16} />
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
