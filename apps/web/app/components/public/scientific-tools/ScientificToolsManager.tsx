'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { CardGrid } from '@/app/components/public/topic/CardGrid'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { parseApiError } from '@/app/lib/cms/save'
import { isContentPath } from '@/app/lib/i18n/content/form'
import type { ScientificTool } from '@/app/lib/scientific-tool-records'
import { scientificToolContent } from '@/app/lib/scientific-tool-schema'
import { ScientificToolCard } from './ScientificToolCard'
import { ScientificToolForm, type ScientificToolFormHandle } from './ScientificToolForm'
import styles from './ScientificToolsManager.module.css'

const sharedFields = ['name', 'accessUrl', 'imageUrl']

export interface ScientificToolsManagerProps {
  tools: readonly ScientificTool[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

/**
 * The tools on `/herramientas-cientificas`. In Modo edición, an account with the grants also
 * gets the add card and each tool's edit and delete controls.
 */
export function ScientificToolsManager({
  tools,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: ScientificToolsManagerProps) {
  const t = useTranslations('scientificTools')
  const feedback = useTranslations('common.feedback')
  const locale = useLocale()
  const router = useRouter()
  const { editMode } = useEditMode()
  const send = useRequestFeedback()
  const [editing, setEditing] = useState<ScientificTool | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const createForm = useRef<ScientificToolFormHandle>(null)
  const editForm = useRef<ScientificToolFormHandle>(null)

  async function uploadImage(file: File, mode: 'create' | 'edit'): Promise<string | null> {
    const data = new FormData()
    data.set('file', file)
    let imageUrl: string | null = null
    await send(
      `/api/scientific-tools/images?mode=${mode}`,
      { method: 'POST', body: data },
      {
        success: t('upload.uploaded'),
        fallback: t('upload.failed'),
        describeFailure: async (response) => {
          if (response.status === 401 || response.status === 403) return t('feedback.forbidden')
          return null
        },
        onSuccess: async (response) => {
          const result = (await response.json()) as { imageUrl: string }
          imageUrl = result.imageUrl
        },
      },
    )
    return imageUrl
  }

  async function mutate(
    method: 'POST' | 'PATCH' | 'DELETE',
    id?: string,
    body?: Record<string, unknown> | null,
    close?: () => void,
  ) {
    if (pending.current) return
    if (body === null) {
      close?.()
      return
    }
    pending.current = true
    setBusy(true)
    try {
      await send(
        `/api/scientific-tools${id ? `/${id}` : ''}`,
        {
          method,
          ...(body
            ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
            : {}),
        },
        {
          success: t(
            method === 'POST'
              ? 'feedback.created'
              : method === 'PATCH'
                ? 'feedback.updated'
                : 'feedback.deleted',
          ),
          fallback: t('feedback.failed'),
          describeFailure: async (response) => {
            if (response.status === 401 || response.status === 403) return t('feedback.forbidden')
            if (response.status === 404) return t('feedback.notFound')
            if (response.status === 409) return t('feedback.conflict')
            const data = parseApiError(await response.json().catch(() => null))
            if (response.status === 400) {
              const errors = Object.fromEntries([
                ...data.issues
                  .filter(
                    ({ path }) =>
                      isContentPath(scientificToolContent, path) || sharedFields.includes(path),
                  )
                  .map(({ path, message }) => [
                    path,
                    locale === 'es' && message ? message : t('feedback.fields'),
                  ]),
                ...data.pending.map((path) => [path, t('feedback.review')]),
              ])
              const form = method === 'POST' ? createForm : editForm
              form.current?.showErrors(errors)
            }
            if (locale === 'es') return null
            if (response.status >= 500) return feedback('server')
            return t(data.code === 'review-required' ? 'feedback.review' : 'feedback.failed')
          },
          onSuccess: () => {
            close?.()
            router.refresh()
          },
        },
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  const showAdd = editMode && canCreate

  return (
    <div>
      {tools.length === 0 ? (
        <p className="content-empty" role="status">
          {t('list.empty')}
        </p>
      ) : (
        <CardGrid columns={1}>
          {tools.map((tool) => (
            <EditableWrapper
              key={tool.id}
              editLabel={t('editor.editNamed', { title: tool.name })}
              deleteLabel={t('editor.deleteNamed', { title: tool.name })}
              onEdit={
                editMode && canEdit && tool.editing && !busy ? () => setEditing(tool) : undefined
              }
              onDelete={
                editMode && canDelete && !busy ? () => void mutate('DELETE', tool.id) : undefined
              }
              deleteConfirmTitle={t('delete.title')}
              deleteConfirmMessage={t('delete.message')}
              deleteConfirmLabel={t('delete.confirm')}
              deleteCancelLabel={t('editor.cancel')}
            >
              <ScientificToolCard tool={tool} />
            </EditableWrapper>
          ))}
        </CardGrid>
      )}
      {showAdd ? (
        <div className={styles.addCard}>
          <AddItemCard
            label={t('editor.add')}
            size="large"
            onRequestClose={() => createForm.current?.requestCancel()}
          >
            {({ close }) => (
              <ScientificToolForm
                ref={createForm}
                busy={busy}
                onCancel={close}
                onUploadImage={(file) => uploadImage(file, 'create')}
                onSave={(body) => mutate('POST', undefined, body, close)}
              />
            )}
          </AddItemCard>
        </div>
      ) : null}
      {editing && editMode && canEdit ? (
        <Modal
          open
          title={t('editor.edit')}
          size="large"
          onClose={() => editForm.current?.requestCancel()}
        >
          <ScientificToolForm
            key={editing.id}
            ref={editForm}
            tool={editing}
            busy={busy}
            onCancel={() => setEditing(null)}
            onUploadImage={(file) => uploadImage(file, 'edit')}
            onSave={(body) => mutate('PATCH', editing.id, body, () => setEditing(null))}
          />
        </Modal>
      ) : null}
    </div>
  )
}
