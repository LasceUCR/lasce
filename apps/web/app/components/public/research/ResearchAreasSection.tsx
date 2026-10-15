'use client'

import { useTranslations } from 'next-intl'
import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ResearchAreaCard } from './ResearchAreaCard'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'

import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import {
  buildCreateRequest,
  buildUpdateRequest,
  emptyInitial,
  initialFromArea,
  type ResearchAreaFormInitial,
} from '@/app/lib/research-area-form'
import type { ResearchArea } from '@/app/lib/research-area-schema'

import {
  ResearchAreaForm,
  type ResearchAreaFormHandle,
  type ResearchAreaFormResult,
} from './ResearchAreaForm'

/** A JSON request for `useRequestFeedback`. */
function jsonRequest(method: 'POST' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export type { ResearchArea } from '@/app/lib/research-area-schema'

export interface ResearchAreasSectionProps {
  /** Visible heading. Omit it when the page already shows the title, and pass `label`. */
  title?: string
  subtitle?: string
  /** Accessible name for the list when there is no visible `title`. */
  label?: string
  id?: string
  /** For an editor, each area carries `editing`: every language and the version to save against. */
  areas: ResearchArea[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

interface Editing {
  area: ResearchArea
  /** Taken when the editor opened, so a refresh behind it cannot change what it saves against. */
  initial: ResearchAreaFormInitial
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

  const [editing, setEditing] = useState<Editing | null>(null)
  // A fresh blank form each time "Agregar" opens, so a closed draft does not come back.
  const [createInitial, setCreateInitial] = useState(emptyInitial)

  // One save at a time: a second click while the first request is in flight would send the same
  // version again and come back as a false conflict.
  const saving = useRef(false)

  // The open forms, so the modal's close button and Escape ask before discarding their changes.
  const createForm = useRef<ResearchAreaFormHandle>(null)
  const editForm = useRef<ResearchAreaFormHandle>(null)

  const fallbackTitleId = useId()
  const titleId = id ? `${id}-title` : fallbackTitleId

  function closeEditor() {
    setEditing(null)
  }

  // Each handler reports its outcome in a toast through `useRequestFeedback` (docs/toasts.md).
  // On failure nothing else happens, so a form stays open with what was typed.
  async function send(url: string, init: RequestInit, success: string, onSuccess: () => void) {
    if (saving.current) return
    saving.current = true
    await sendWithFeedback(url, init, {
      success,
      fallback: t('errors.saveUnknown'),
      onSuccess,
    })
    saving.current = false
  }

  async function handleSaveArea({ draft, confirmed, src }: ResearchAreaFormResult) {
    if (!editing) return

    const body = buildUpdateRequest(editing.initial, draft, confirmed, src)
    if (!body) {
      closeEditor()
      return
    }

    await send(
      `/api/research-areas/${editing.area.id}`,
      jsonRequest('PATCH', body),
      t('updated'),
      () => {
        closeEditor()
        router.refresh()
      },
    )
  }

  async function handleCreateArea({ draft, src }: ResearchAreaFormResult, close: () => void) {
    await send(
      '/api/research-areas',
      jsonRequest('POST', buildCreateRequest(draft, src)),
      t('created'),
      () => {
        setCreateInitial(emptyInitial())
        close()
        router.refresh()
      },
    )
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
          <AddItemCard
            label={t('editor.addCard')}
            onRequestClose={(close) => {
              if (createForm.current) createForm.current.requestCancel()
              else close()
            }}
            size="large"
          >
            {({ close }) => (
              <ResearchAreaForm
                initial={createInitial}
                onCancel={close}
                onSave={(result) => handleCreateArea(result, close)}
                ref={createForm}
              />
            )}
          </AddItemCard>
        ) : null}

        {areas.length > 0 ? (
          <ul
            className="research-area-list"
            aria-label={title ? undefined : label}
            aria-labelledby={title ? titleId : undefined}
          >
            {areas.map((area) => {
              const card = (
                <ResearchAreaCard
                  contentLang={contentLangAttribute(area.contentLocale)}
                  description={area.description}
                  href={`/investigacion/areas/${area.id}`}
                  src={area.src}
                  title={area.title}
                />
              )

              // The editing controls only show in "Modo edición", for an account allowed to use them.
              if (!editMode || (!canEdit && !canDelete)) return <li key={area.id}>{card}</li>

              return (
                <li key={area.id}>
                  <EditableWrapper
                    deleteCancelLabel={t('deleteDialog.cancel')}
                    deleteConfirmLabel={t('deleteDialog.confirm')}
                    deleteConfirmMessage={t('deleteDialog.message')}
                    deleteConfirmTitle={t('deleteDialog.title')}
                    deleteLabel={t('editor.deleteLabel', { title: area.title })}
                    deleteTargetEntity={area.title}
                    deleteTargetLabel={t('deleteDialog.target')}
                    editLabel={t('editor.editLabel', { title: area.title })}
                    onDelete={canDelete ? () => handleDeleteArea(area.id) : undefined}
                    onEdit={
                      canEdit
                        ? () => setEditing({ area, initial: initialFromArea(area) })
                        : undefined
                    }
                  >
                    {card}
                  </EditableWrapper>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      <Modal
        onClose={() => {
          if (editForm.current) editForm.current.requestCancel()
          else closeEditor()
        }}
        open={editing !== null}
        size="large"
        title={editing ? t('editor.editTitle', { title: editing.area.title }) : ''}
      >
        {editing ? (
          <ResearchAreaForm
            initial={editing.initial}
            onCancel={closeEditor}
            onSave={handleSaveArea}
            ref={editForm}
          />
        ) : null}
      </Modal>
    </section>
  )
}
