'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { sendJson } from '@/app/lib/cms/save'
import {
  buildUpdateRequest,
  describeSaveFailure,
  initialFromSection,
  type SaveFailure,
  type SectionDraft,
} from '@/app/lib/solar-physics-section-form'
import type {
  SolarPhysicsSection,
  SolarPhysicsSectionReviewConfirmation as ReviewConfirmation,
} from '@/app/lib/solar-physics-section-schema'

import { LasceSectionForm, type LasceSectionFormHandle } from './LasceSectionForm'
import { LasceSectionView } from './LasceSectionView'
import { useSolarPhysicsEditorLanguage } from './useSolarPhysicsEditorLanguage'

export interface EditableLasceSectionProps {
  section: SolarPhysicsSection
  /** True for someone who may edit it. The section must then carry its `editing` data. */
  canEdit?: boolean
}

/**
 * The "El trabajo de LASCE en Física Solar" section of `/fisica-solar` for someone who may edit
 * it. It shows the same section as a visitor sees (`LasceSectionView`); in "Modo edición" it
 * gets an Edit button that opens a bilingual form in a modal. The outcome of a save is reported
 * with a toast; problems with a field stay under that field.
 */
export function EditableLasceSection({ section, canEdit = false }: EditableLasceSectionProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const t = useTranslations('solarPhysics')
  const toast = useToast()
  const language = useSolarPhysicsEditorLanguage()

  const [open, setOpen] = useState(false)
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null)

  // Taken when the editor opens, so a refresh behind it cannot change what it saves against.
  const [initial, setInitial] = useState(() => initialFromSection(section))

  // One save at a time: a second click while the first request is in flight would send the same
  // version again and come back as a false conflict.
  const saving = useRef(false)
  const form = useRef<LasceSectionFormHandle>(null)

  function openEditor() {
    setSaveFailure(null)
    setInitial(initialFromSection(section))
    setOpen(true)
  }

  function closeEditor() {
    setSaveFailure(null)
    setOpen(false)
  }

  async function handleSave(draft: SectionDraft, confirmed: ReviewConfirmation[]) {
    if (!initial) return

    const body = buildUpdateRequest(initial, draft, confirmed)
    if (!body) {
      closeEditor()
      return
    }

    if (saving.current) return
    saving.current = true

    const result = await sendJson('/api/solar-physics/lasce-section', 'PATCH', body)
    saving.current = false

    if (!result.ok) {
      const failure =
        result.status === 0
          ? { message: language.saveErrors.generic, fieldErrors: {}, reopen: false }
          : describeSaveFailure(result.status, result.body, language)
      setSaveFailure(failure)
      toast.show('error', failure.message)
      return
    }

    toast.show('success', t('editor.updated'))
    closeEditor()
    router.refresh()
  }

  const content = <LasceSectionView section={section} />

  if (!editMode || !canEdit || !section.editing) return content

  return (
    <>
      <EditableWrapper
        className="solar-lasce-section-editable page-width"
        editLabel={t('editor.editLabel')}
        onEdit={openEditor}
      >
        {content}
      </EditableWrapper>

      <Modal
        onClose={() => {
          if (form.current) form.current.requestCancel()
          else closeEditor()
        }}
        open={open}
        size="large"
        title={t('editor.editTitle')}
      >
        {open && initial ? (
          <>
            {saveFailure?.reopen ? (
              <Button
                onClick={() => {
                  closeEditor()
                  router.refresh()
                }}
                variant="secondary"
              >
                {t('editor.reload')}
              </Button>
            ) : null}

            <LasceSectionForm
              initial={initial}
              onCancel={closeEditor}
              onSave={handleSave}
              ref={form}
              serverErrors={saveFailure?.fieldErrors}
            />
          </>
        ) : null}
      </Modal>
    </>
  )
}
