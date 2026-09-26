'use client'

import { useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { TeamMember } from '@/app/lib/rosac'

import { ResearcherCard } from './ResearcherCard'
import { ResearcherForm, type ResearcherFormValues } from './ResearcherForm'

export interface EditableResearcherCardProps {
  researcher: TeamMember
  canEdit?: boolean
  canDelete?: boolean
  /** Persists the edit; resolves to an error message on failure, or `null` on success. */
  onSave: (values: ResearcherFormValues) => Promise<string | null>
  onDelete: () => void
}

/**
 * The one piece that knows both about `TeamMember` and about "Modo edición"
 * — `ResearcherCard`, `EditableWrapper` and `ResearcherForm` stay unaware of
 * each other and of the toggle. `TeamGallery` slots this in through its
 * `renderPerson` override so the shared gallery track stays presentational.
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
      {saveError ? <p className="form-alert">{saveError}</p> : null}
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
