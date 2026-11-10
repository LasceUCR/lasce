'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'

import { ResearcherCard } from './ResearcherCard'
import {
  ResearcherForm,
  type BilingualResearcherFormValues,
  type PersonProfile,
  type ResearcherFormTranslation,
} from './ResearcherForm'

export interface EditableResearcherCardProps {
  researcher: PersonProfile
  canEdit?: boolean
  canDelete?: boolean
  /** The `lang` of the researcher's role and description; see `ResearcherCardProps`. */
  contentLang?: string
  /** Label preceding the institution text. Defaults to the translated `researchers.institutionLabel`. */
  institutionLabel?: string
  onDelete: () => void
  /**
   * The researcher's text in both languages and its version. `/nosotros` and `/radioastronomia`
   * both pass it, so the role and the description are edited in Spanish and English.
   */
  translation: ResearcherFormTranslation
  /**
   * Persists the edit; resolves to whether it was saved. The caller reports a failure itself (a
   * toast), so the modal only stays open and no message is shown here.
   */
  onSave: (values: BilingualResearcherFormValues) => Promise<boolean>
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
  contentLang,
  institutionLabel,
  onDelete,
  translation,
  onSave,
}: EditableResearcherCardProps) {
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)
  const tResearchers = useTranslations('researchers')
  const resolvedInstitutionLabel = institutionLabel ?? tResearchers('institutionLabel')

  const card = (
    <ResearcherCard
      contentLang={contentLang}
      description={researcher.description}
      email={researcher.email}
      institution={researcher.institution}
      institutionLabel={resolvedInstitutionLabel}
      name={researcher.name}
      role={researcher.role}
      src={researcher.src}
    />
  )

  function closeEditor() {
    setIsEditing(false)
  }

  function renderForm() {
    return (
      <ResearcherForm
        onCancel={closeEditor}
        onSave={async (values) => {
          if (await onSave(values)) closeEditor()
        }}
        researcher={researcher}
        translation={translation}
      />
    )
  }

  const editModal = (
    <Modal
      onClose={closeEditor}
      open={isEditing}
      size="medium"
      title={tResearchers('editor.editTitle')}
    >
      {renderForm()}
    </Modal>
  )

  const showEditor = editMode && (canEdit || canDelete)

  if (!showEditor) {
    return card
  }

  return (
    <>
      <EditableWrapper
        deleteCancelLabel={tResearchers('editor.deleteCancel')}
        deleteConfirmLabel={tResearchers('editor.deleteConfirm')}
        deleteConfirmMessage={tResearchers('editor.deleteConfirmMessage', {
          name: researcher.name,
        })}
        deleteConfirmTitle={tResearchers('editor.deleteConfirmTitle')}
        deleteLabel={tResearchers('editor.deleteLabel', { name: researcher.name })}
        editLabel={tResearchers('editor.editLabel', { name: researcher.name })}
        onDelete={canDelete ? onDelete : undefined}
        onEdit={canEdit ? () => setIsEditing(true) : undefined}
      >
        {card}
      </EditableWrapper>
      {editModal}
    </>
  )
}
