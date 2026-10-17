'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import {
  buildSectionRequest,
  jsonRequest,
  sectionInitial,
  type SpaceWeatherSectionDraft,
  type SpaceWeatherSectionFormInitial,
} from '@/app/lib/space-weather-section-form'
import type {
  SpaceWeatherSection,
  SpaceWeatherSectionReviewConfirmation,
} from '@/app/lib/space-weather-section-schema'

import { CostaRicaSectionForm, type CostaRicaSectionFormHandle } from './CostaRicaSectionForm'
import { CostaRicaSectionView } from './CostaRicaSectionView'

export interface EditableCostaRicaSectionProps {
  section: SpaceWeatherSection
  /** True for someone who may edit it. The section must then carry its `editing` data. */
  canEdit?: boolean
}

/**
 * The one piece that knows both the "¿Por qué estudiarlo desde Costa Rica?" card's data and
 * "Modo edición". With edit mode off, or for someone who cannot edit, it is the plain
 * `CostaRicaSectionView`. Otherwise it offers to edit the title and text in both languages; there
 * is nothing to add or delete.
 */
export function EditableCostaRicaSection({
  section,
  canEdit = false,
}: EditableCostaRicaSectionProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const t = useTranslations('spaceWeather')
  const sendWithFeedback = useRequestFeedback()
  const form = useRef<CostaRicaSectionFormHandle>(null)
  // One save at a time: a second click while the first is in flight would send the same version
  // again and come back as a false conflict.
  const saving = useRef(false)

  // Taken when the editor opens, so a refresh behind it cannot change what it saves against.
  const [initial, setInitial] = useState<SpaceWeatherSectionFormInitial | null>(null)

  const content = <CostaRicaSectionView section={section} />

  const { editing } = section
  if (!editMode || !canEdit || !editing) return content

  function close() {
    setInitial(null)
  }

  async function handleSave(
    draft: SpaceWeatherSectionDraft,
    confirmed: SpaceWeatherSectionReviewConfirmation[],
  ) {
    if (!initial) return
    const body = buildSectionRequest(initial, draft, confirmed)
    if (!body) {
      close()
      return
    }

    if (saving.current) return
    saving.current = true
    await sendWithFeedback('/api/space-weather/costa-rica', jsonRequest('PATCH', body), {
      success: t('editor.updated'),
      fallback: t('saveErrors.failed'),
      onSuccess: () => {
        close()
        router.refresh()
      },
    })
    saving.current = false
  }

  const modal = (
    <Modal
      onClose={() => {
        if (form.current) form.current.requestCancel()
        else close()
      }}
      open={initial !== null}
      size="large"
      title={t('editor.editTitle')}
    >
      {initial ? (
        <CostaRicaSectionForm initial={initial} onCancel={close} onSave={handleSave} ref={form} />
      ) : null}
    </Modal>
  )

  return (
    <>
      <EditableWrapper
        className="space-weather-section-editable page-width"
        editLabel={t('editor.editLabel')}
        onEdit={() => setInitial(sectionInitial(editing))}
      >
        {content}
      </EditableWrapper>
      {/* Outside the section, whose `.topic-section h2` styles would otherwise reach the dialog. */}
      {initial ? createPortal(modal, document.body) : null}
    </>
  )
}
