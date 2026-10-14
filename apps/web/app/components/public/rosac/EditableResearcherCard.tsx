'use client'

import { useEffect, useRef, useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

import { ResearcherCard } from './ResearcherCard'
import {
  ResearcherForm,
  type BilingualResearcherFormValues,
  type PersonProfile,
  type ResearcherFormTranslation,
  type ResearcherFormValues,
} from './ResearcherForm'

interface EditableResearcherCardBaseProps {
  researcher: PersonProfile
  canEdit?: boolean
  canDelete?: boolean
  /** The `lang` of the researcher's role and description; see `ResearcherCardProps`. */
  contentLang?: string
  onDelete: () => void
}

/** The single-language card (ROSAC). */
export interface SingleLanguageEditableResearcherCardProps extends EditableResearcherCardBaseProps {
  translation?: undefined
  /** Persists the edit; resolves to an error message on failure, or `null` on success. */
  onSave: (values: ResearcherFormValues) => Promise<string | null>
}

/**
 * The opt-in bilingual card (`/nosotros`): its form edits the role and the description per
 * language. `translation.editing` is the researcher's text in both languages and its version.
 */
export interface BilingualEditableResearcherCardProps extends EditableResearcherCardBaseProps {
  translation: ResearcherFormTranslation
  /**
   * Persists the edit; resolves to whether it was saved. The caller reports a failure itself (a
   * toast), so the modal only stays open and no message is shown here.
   */
  onSave: (values: BilingualResearcherFormValues) => Promise<boolean>
}

export type EditableResearcherCardProps =
  SingleLanguageEditableResearcherCardProps | BilingualEditableResearcherCardProps

/**
 * The one piece that knows both about a person's profile and about "Modo
 * edición" — `ResearcherCard`, `EditableWrapper` and `ResearcherForm` stay
 * unaware of each other and of the toggle. `TeamGallery` slots this in
 * through its `renderPerson` override so the shared gallery track stays
 * presentational. Reused by both `/radioastronomia` (ROSAC) and `/nosotros`
 * — the `researcher` prop and `onSave`/`onDelete` callbacks are the only
 * seam to whichever content module owns the actual record.
 *
 * `/nosotros` passes `translation` to opt in to the bilingual form; ROSAC passes nothing and
 * keeps the single-language one.
 */
export function EditableResearcherCard(props: EditableResearcherCardProps) {
  const { researcher, canEdit = false, canDelete = false, contentLang, onDelete } = props
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
      contentLang={contentLang}
      description={researcher.description}
      email={researcher.email}
      institution={researcher.institution}
      name={researcher.name}
      role={researcher.role}
      src={researcher.src}
    />
  )

  function closeEditor() {
    setSaveError(null)
    setIsEditing(false)
  }

  function renderForm() {
    if (props.translation) {
      const { translation, onSave } = props
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

    const { onSave } = props
    return (
      <ResearcherForm
        onCancel={closeEditor}
        onSave={async (values) => {
          const error = await onSave(values)
          if (error) {
            setSaveError(error)
            return
          }
          closeEditor()
        }}
        researcher={researcher}
      />
    )
  }

  const editModal = (
    <Modal onClose={closeEditor} open={isEditing} size="large" title="Editar investigador">
      {saveError ? (
        <p className="form-alert" ref={saveErrorRef} role="alert">
          {saveError}
        </p>
      ) : null}
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
