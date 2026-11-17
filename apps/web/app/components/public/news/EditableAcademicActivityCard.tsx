'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import {
  initialFromActivity,
  type AcademicActivityDraft,
  type AcademicActivityFormInitial,
} from '@/app/lib/academic-activities-form'
import type { AcademicActivity, ReviewConfirmation } from '@/app/lib/academic-activities'

import { AcademicActivityCard } from './AcademicActivityCard'
import { AcademicActivityForm, type AcademicActivityFormHandle } from './AcademicActivityForm'

export interface EditableAcademicActivityCardProps {
  activity: AcademicActivity
  canEdit?: boolean
  canDelete?: boolean
  /** True while a save or delete is in flight. */
  busy?: boolean
  /**
   * Persists the edit made from `initial`. Calls `close` once it is saved, so the modal shuts
   * before any success message; on failure it leaves the modal open with the admin's input and
   * reports the reason itself (a toast, which renders inside the open modal).
   */
  onSave: (
    initial: AcademicActivityFormInitial,
    draft: AcademicActivityDraft,
    confirmed: ReviewConfirmation[],
    newPhotoUrl: string | null,
    close: () => void,
  ) => void | Promise<void>
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
  // Taken when the editor opens, so a refresh behind it cannot change what it saves against.
  const [editing, setEditing] = useState<AcademicActivityFormInitial | null>(null)
  const form = useRef<AcademicActivityFormHandle>(null)

  const card = <AcademicActivityCard activity={activity} />

  function close() {
    setEditing(null)
  }

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
        onEdit={canEdit && !busy ? () => setEditing(initialFromActivity(activity)) : undefined}
      >
        {card}
      </EditableWrapper>

      <Modal
        onClose={() => {
          if (form.current) form.current.requestCancel()
          else close()
        }}
        open={editing !== null}
        size="large"
        title={t('editTitle')}
      >
        {editing ? (
          <AcademicActivityForm
            busy={busy}
            initial={editing}
            onCancel={close}
            onSave={(draft, confirmed, newPhotoUrl) =>
              onSave(editing, draft, confirmed, newPhotoUrl, close)
            }
            ref={form}
          />
        ) : null}
      </Modal>
    </>
  )
}
