'use client'

import { useTranslations } from 'next-intl'
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
  /** True while a save or delete is in flight. */
  busy?: boolean
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
  busy = false,
  onSave,
  onDelete,
}: EditableAcademicActivityCardProps) {
  const t = useTranslations('academicActivities.editor')
  const deleteT = useTranslations('academicActivities.deleteDialog')
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)

  const card = <AcademicActivityCard activity={activity} />

  function close() {
    setIsEditing(false)
  }

  const editModal = (
    <Modal onClose={close} open={isEditing} size="large" title={t('editTitle')}>
      <AcademicActivityForm
        activity={activity}
        busy={busy}
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
        deleteConfirmLabel={deleteT('confirm')}
        deleteConfirmMessage={deleteT('message')}
        deleteConfirmTitle={deleteT('title')}
        deleteCancelLabel={deleteT('cancel')}
        deleteLabel={t('deleteLabel')}
        editLabel={t('editLabel')}
        onDelete={canDelete && !busy ? onDelete : undefined}
        onEdit={canEdit && !busy ? () => setIsEditing(true) : undefined}
      >
        {card}
      </EditableWrapper>
      {editModal}
    </>
  )
}
