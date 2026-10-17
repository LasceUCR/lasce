'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { CollaborationCard } from '@/app/components/public/research/CollaborationCard'
import { ResearchCollaborationsSection } from '@/app/components/public/research/ResearchCollaborationsSection'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { parseApiError } from '@/app/lib/cms/save'
import type { ResearchCollaboration } from '@/app/lib/research-collaborations'
import { CollaborationForm, type CollaborationFormHandle } from './CollaborationForm'
import styles from './CollaborationsManager.module.css'

export interface CollaborationsManagerProps {
  collaborations: ResearchCollaboration[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function CollaborationsManager({
  collaborations,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: CollaborationsManagerProps) {
  const t = useTranslations('collaborations')
  const feedback = useTranslations('common.feedback')
  const locale = useLocale()
  const router = useRouter()
  const { editMode } = useEditMode()
  const send = useRequestFeedback()
  const [editing, setEditing] = useState<ResearchCollaboration | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const createForm = useRef<CollaborationFormHandle>(null)
  const editForm = useRef<CollaborationFormHandle>(null)

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
        `/api/collaborations${id ? `/${id}` : ''}`,
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
            if (locale === 'es') return null
            if (response.status >= 500) return feedback('server')
            const data = parseApiError(await response.json().catch(() => null))
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

  return (
    <div className={styles.manager}>
      <ResearchCollaborationsSection
        collaborations={collaborations}
        addCard={
          editMode && canCreate ? (
            <AddItemCard
              label={t('editor.add')}
              size="large"
              onRequestClose={() => createForm.current?.requestCancel()}
            >
              {({ close }) => (
                <CollaborationForm
                  ref={createForm}
                  busy={busy}
                  onCancel={close}
                  onSave={(body) => void mutate('POST', undefined, body, close)}
                />
              )}
            </AddItemCard>
          ) : null
        }
        renderCard={(record) =>
          editMode && (canEdit || canDelete) ? (
            <EditableWrapper
              editLabel={t('editor.editNamed', { name: record.name })}
              deleteLabel={t('editor.deleteNamed', { name: record.name })}
              onEdit={canEdit && record.editing && !busy ? () => setEditing(record) : undefined}
              onDelete={canDelete && !busy ? () => void mutate('DELETE', record.id) : undefined}
              deleteConfirmTitle={t('delete.title')}
              deleteConfirmMessage={t('delete.message')}
              deleteConfirmLabel={t('delete.confirm')}
              deleteCancelLabel={t('editor.cancel')}
            >
              <CollaborationCard {...record} />
            </EditableWrapper>
          ) : (
            <CollaborationCard {...record} />
          )
        }
      />
      {editing && editMode && canEdit ? (
        <Modal
          open
          title={t('editor.edit')}
          size="large"
          onClose={() => editForm.current?.requestCancel()}
        >
          <CollaborationForm
            key={editing.id}
            ref={editForm}
            collaboration={editing}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSave={(body) => void mutate('PATCH', editing.id, body, () => setEditing(null))}
          />
        </Modal>
      ) : null}
    </div>
  )
}
