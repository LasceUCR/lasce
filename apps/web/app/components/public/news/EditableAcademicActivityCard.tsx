'use client'

import { useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { AcademicActivity } from '@/app/lib/academic-activities'

import { AcademicActivityCard } from './AcademicActivityCard'
import { AcademicActivityForm, type AcademicActivityFormValues } from './AcademicActivityForm'

export interface EditableAcademicActivityCardProps {
  activity: AcademicActivity
  canEdit?: boolean
  canDelete?: boolean
  /**
   * Persists the edit. Calls `close` once it is saved, so the modal shuts before any success
   * message; on failure it leaves the modal open with the admin's input and reports the reason
   * itself (a toast, which renders inside the open modal).
   */
  onSave: (values: AcademicActivityFormValues, close: () => void) => void | Promise<void>
  onDelete: () => void
}

/**
 * The one piece that knows both about `AcademicActivity` and about "Modo edición" —
 * `AcademicActivityCard`, `EditableWrapper` and `AcademicActivityForm` stay unaware of each other
 * and of the toggle.
 */
export function EditableAcademicActivityCard({
  activity,
  canEdit = false,
  canDelete = false,
  onSave,
  onDelete,
}: EditableAcademicActivityCardProps) {
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)

  const card = <AcademicActivityCard activity={activity} />

  function close() {
    setIsEditing(false)
  }

  const editModal = (
    <Modal onClose={close} open={isEditing} size="large" title="Editar actividad académica">
      <AcademicActivityForm
        activity={activity}
        onCancel={close}
        onSave={(values) => onSave(values, close)}
      />
    </Modal>
  )

  const showEditor = editMode && (canEdit || canDelete)

  if (!showEditor) {
    return card
  }

  return (
    <>
      <EditableWrapper
        deleteConfirmLabel="Eliminar"
        deleteConfirmMessage="Esta acción no se puede deshacer y borrará la actividad del catálogo público."
        deleteConfirmTitle="Eliminar actividad académica"
        onDelete={canDelete ? onDelete : undefined}
        onEdit={canEdit ? () => setIsEditing(true) : undefined}
      >
        {card}
      </EditableWrapper>
      {editModal}
    </>
  )
}
