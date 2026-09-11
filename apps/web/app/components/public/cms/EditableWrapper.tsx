'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { IconButton } from '@/app/components/public/IconButton'

export interface EditableWrapperProps {
  children: ReactNode
  onEdit: () => void
  onDelete: () => void
  deleteConfirmTitle?: string
  deleteConfirmMessage?: string
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
  deleteConfirmTitle = 'Eliminar elemento',
  deleteConfirmMessage = '¿Desea eliminar este elemento? Esta acción no se puede deshacer.',
  className,
}: EditableWrapperProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const classes = ['editable', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {children}

      <div className="editable-actions">
        <IconButton icon={<Pencil size={16} strokeWidth={1.8} />} label="Editar" onClick={onEdit} />
        <IconButton
          icon={<Trash2 size={16} strokeWidth={1.8} />}
          label="Eliminar"
          onClick={() => setConfirmOpen(true)}
          variant="danger"
        />
      </div>

      <ConfirmDialog
        confirmVariant="danger"
        message={deleteConfirmMessage}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          onDelete()
        }}
        open={confirmOpen}
        title={deleteConfirmTitle}
      />
    </div>
  )
}
