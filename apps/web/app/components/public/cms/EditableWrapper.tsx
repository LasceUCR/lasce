'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { IconButton } from '@/app/components/public/IconButton'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'

export interface EditableWrapperProps {
  children: ReactNode
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
  deleteConfirmTitle?: string
  deleteConfirmMessage?: string
  deleteTargetEntity?: string
  deleteConsequence?: string
  className?: string
}

/**
 * Wraps a piece of content with the edit/delete affordances the "Modo
 * edición" toggle reveals. Content-agnostic: it doesn't know what `children`
 * is, only how to offer editing it (`onEdit`) or removing it (`onDelete`,
 * gated behind a confirmation dialog since deleting is not undoable yet).
 */
export function EditableWrapper({
  children,
  onEdit,
  onDelete,
  editLabel = 'Editar',
  deleteLabel = 'Eliminar',
  deleteConfirmTitle = 'Eliminar elemento',
  deleteConfirmMessage = '¿Desea eliminar este elemento? Esta acción no se puede deshacer.',
  deleteTargetEntity,
  deleteConsequence,
  className,
}: EditableWrapperProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const classes = ['editable', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {children}

      <div className="editable-actions">
        {onEdit ? (
          <IconButton
            icon={<Pencil size={16} strokeWidth={1.8} />}
            label={editLabel}
            onClick={onEdit}
          />
        ) : null}
        {onDelete ? (
          <IconButton
            icon={<Trash2 size={16} strokeWidth={1.8} />}
            label={deleteLabel}
            onClick={() => setConfirmOpen(true)}
            variant="danger"
          />
        ) : null}
      </div>

      {onDelete ? (
        <StandardConfirmDialog
          cancelLabel="Cancelar"
          confirmLabel="Confirmar"
          consequence={deleteConsequence}
          message={deleteConfirmMessage}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            onDelete()
          }}
          open={confirmOpen}
          severity="danger"
          targetEntity={deleteTargetEntity}
          title={deleteConfirmTitle}
        />
      ) : null}
    </div>
  )
}
