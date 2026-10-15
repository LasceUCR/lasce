'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ResearchAreaCard } from './ResearchAreaCard'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'

import type { ResearchArea } from '@/app/lib/research-area-schema'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'

import { ResearchAreaForm, type ResearchAreaFormValues } from './ResearchAreaForm'

/** A JSON request for `useRequestFeedback`. */
function jsonRequest(method: 'POST' | 'PATCH', values: ResearchAreaFormValues): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  }
}

const blankArea: ResearchAreaFormValues = {
  title: ' ',
  description: '',
  src: '',
}

export type { ResearchArea } from '@/app/lib/research-area-schema'

export interface ResearchAreasSectionProps {
  /** Visible heading. Omit it when the page already shows the title, and pass `label`. */
  title?: string
  subtitle?: string
  /** Accessible name for the list when there is no visible `title`. */
  label?: string
  id?: string
  areas: ResearchArea[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function ResearchAreasSection({
  id,
  title,
  subtitle,
  label,
  areas,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: ResearchAreasSectionProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const t = useTranslations('researchAreas')
  const sendWithFeedback = useRequestFeedback()

  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)

  const editingArea = areas.find((area) => area.id === editingAreaId)

  const fallbackTitleId = useId()
  const titleId = id ? `${id}-title` : fallbackTitleId

  function closeEditor() {
    setEditingAreaId(null)
  }

  // Each handler reports its outcome in a toast through `useRequestFeedback` (docs/toasts.md).
  // On failure nothing else happens, so a form stays open with what was typed.
  async function handleSaveArea(values: ResearchAreaFormValues) {
    if (!editingAreaId) return

    await sendWithFeedback(`/api/research-areas/${editingAreaId}`, jsonRequest('PATCH', values), {
      success: t('updated'),
      fallback: t('errors.saveUnknown'),
      onSuccess: () => {
        closeEditor()
        router.refresh()
      },
    })
  }

  async function handleCreateArea(values: ResearchAreaFormValues, close: () => void) {
    await sendWithFeedback('/api/research-areas', jsonRequest('POST', values), {
      success: t('created'),
      fallback: t('errors.saveUnknown'),
      onSuccess: () => {
        close()
        router.refresh()
      },
    })
  }

  async function handleDeleteArea(areaId: string) {
    await sendWithFeedback(
      `/api/research-areas/${areaId}`,
      { method: 'DELETE' },
      {
        success: t('deleted'),
        fallback: t('errors.deleteUnknown'),
        onSuccess: () => router.refresh(),
      },
    )
  }

  return (
    <section className="research-areas page-width" id={id}>
      {title || subtitle ? (
        <header className="research-areas-header">
          {title ? <h2 id={titleId}>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
      ) : null}

      <div className="research-area-content">
        {editMode && canCreate ? (
          <AddItemCard label="Añadir">
            {({ close }) => (
              <>
                <ResearchAreaForm
                  area={blankArea}
                  confirmMessage="¿Desea agregar esta área?"
                  confirmTitle="Agregar área"
                  onCancel={close}
                  onSave={(values) => handleCreateArea(values, close)}
                />
              </>
            )}
          </AddItemCard>
        ) : null}

        {areas.length > 0 ? (
          <ul
            className="research-area-list"
            aria-label={title ? undefined : label}
            aria-labelledby={title ? titleId : undefined}
          >
            {areas.map((area) => (
              <li key={area.id}>
                <EditableWrapper
                  key={area.id}
                  onEdit={canEdit ? () => setEditingAreaId(area.id) : undefined}
                  onDelete={canDelete ? () => handleDeleteArea(area.id) : undefined}
                  deleteConfirmLabel="Eliminar"
                  deleteConfirmTitle="Eliminar área"
                >
                  <ResearchAreaCard
                    contentLang={contentLangAttribute(area.contentLocale)}
                    description={area.description}
                    href={`/investigacion/areas/${area.id}`}
                    src={area.src}
                    title={area.title}
                  />
                </EditableWrapper>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Modal
        open={editingArea !== undefined}
        onClose={closeEditor}
        title={editingArea ? `Editar "${editingArea.title}"` : 'Editar área'}
      >
        {editingArea ? (
          <>
            <ResearchAreaForm
              area={{
                title: editingArea.title,
                description: editingArea.description,
                src: editingArea.src ?? '',
              }}
              confirmMessage="¿Desea guardar los cambios?"
              confirmTitle="Editar área"
              onCancel={closeEditor}
              onSave={handleSaveArea}
            />
          </>
        ) : null}
      </Modal>
    </section>
  )
}
