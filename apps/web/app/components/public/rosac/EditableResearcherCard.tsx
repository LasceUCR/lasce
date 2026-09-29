'use client'

import { useEffect, useRef, useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

import { ResearcherCard } from './ResearcherCard'
import { ResearcherForm, type PersonProfile, type ResearcherFormValues } from './ResearcherForm'

export interface EditableResearcherCardProps {
  researcher: PersonProfile
  canEdit?: boolean
  canDelete?: boolean
  /** Persists the edit; resolves to an error message on failure, or `null` on success. */
  onSave: (values: ResearcherFormValues) => Promise<string | null>
  onDelete: () => void
}

/**
 * The one piece that knows both about a person's profile and about "Modo
 * edición" — `ResearcherCard`, `EditableWrapper` and `ResearcherForm` stay
 * unaware of each other and of the toggle. `TeamGallery` slots this in
 * through its `renderPerson` override so the shared gallery track stays
 * presentational. Reused by both `/radioastronomia` (ROSAC) and `/nosotros`
 * — the `researcher` prop and `onSave`/`onDelete` callbacks are the only
 * seam to whichever content module owns the actual record.
 */
export function EditableResearcherCard({
  researcher,
  canEdit = false,
  canDelete = false,
  onSave,
  onDelete,
}: EditableResearcherCardProps) {
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveErrorRef = useRef<HTMLParagraphElement>(null)

  // Scrolls the error into view as soon as it appears — the modal can be
  // taller than the viewport, and a message added above a long form is
  // otherwise easy to miss without scrolling back up.
  useEffect(() => {
    if (saveError) {
      scrollIntoViewIfSupported(saveErrorRef.current)
    }
  }, [saveError])

  const card = (
    <ResearcherCard
      description={researcher.description}
      email={researcher.email}
      institution={researcher.institution}
      name={researcher.name}
      role={researcher.role}
      src={researcher.src}
    />
  )

  async function handleFormSave(values: ResearcherFormValues) {
    const error = await onSave(values)
    if (error) {
      setSaveError(error)
      return
    }
    setSaveError(null)
    setIsEditing(false)
  }

  const editModal = (
    <Modal
      onClose={() => {
        setSaveError(null)
        setIsEditing(false)
      }}
      open={isEditing}
      size="large"
      title="Editar investigador"
    >
      {saveError ? (
        <p className="form-alert" ref={saveErrorRef} role="alert">
          {saveError}
        </p>
      ) : null}
      <ResearcherForm
        onCancel={() => {
          setSaveError(null)
          setIsEditing(false)
        }}
        onSave={handleFormSave}
        researcher={researcher}
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
        deleteConfirmMessage={`¿Desea eliminar a "${researcher.name}"? Esta acción no se puede deshacer.`}
        deleteConfirmTitle="Eliminar investigador"
        deleteLabel={`Eliminar a ${researcher.name}`}
        editLabel={`Editar a ${researcher.name}`}
        onDelete={canDelete ? onDelete : undefined}
        onEdit={canEdit ? () => setIsEditing(true) : undefined}
      >
        {card}
      </EditableWrapper>
      {editModal}
    </>
  )
}
