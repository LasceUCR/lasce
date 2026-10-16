'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'

import { ResearcherCard } from './ResearcherCard'
import { ResearcherForm, type PersonProfile, type ResearcherFormValues } from './ResearcherForm'

export interface EditableResearcherCardProps {
  researcher: PersonProfile
  canEdit?: boolean
  canDelete?: boolean
  /** Label preceding the institution text. Defaults to the translated `researchers.institutionLabel`. */
  institutionLabel?: string
  /**
   * Persists the edit and reports the outcome in a toast; resolves to whether it succeeded, so
   * the modal closes only once the save is done and stays open, with the input, on failure.
   */
  onSave: (values: ResearcherFormValues) => Promise<boolean>
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
  institutionLabel,
  onSave,
  onDelete,
}: EditableResearcherCardProps) {
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)
  const tResearchers = useTranslations('researchers')
  const resolvedInstitutionLabel = institutionLabel ?? tResearchers('institutionLabel')

  const card = (
    <ResearcherCard
      description={researcher.description}
      email={researcher.email}
      institution={researcher.institution}
      institutionLabel={resolvedInstitutionLabel}
      name={researcher.name}
      role={researcher.role}
      src={researcher.src}
    />
  )

  async function handleFormSave(values: ResearcherFormValues) {
    const saved = await onSave(values)
    if (saved) {
      setIsEditing(false)
    }
  }

  const editModal = (
    <Modal
      onClose={() => setIsEditing(false)}
      open={isEditing}
      size="large"
      title="Editar investigador"
    >
      <ResearcherForm
        onCancel={() => setIsEditing(false)}
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
        deleteConfirmLabel="Eliminar"
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
