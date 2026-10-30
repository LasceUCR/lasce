'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import { parseApiError } from '@/app/lib/cms/save'
import { isContentPath } from '@/app/lib/i18n/content/form'
import { initiativeContent } from '@/app/lib/initiative-schema'
import type { CollaborationInitiative } from '@/app/lib/collaborations'
import { InitiativeForm, type InitiativeFormHandle } from './InitiativeForm'
import { InitiativeCard } from './InitiativeCard'
import styles from './InitiativesManager.module.css'

export interface InitiativesManagerProps {
  initiatives: readonly CollaborationInitiative[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export function InitiativesManager({
  initiatives,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: InitiativesManagerProps) {
  const t = useTranslations('initiatives')
  const feedback = useTranslations('common.feedback')
  const locale = useLocale()
  const router = useRouter()
  const { editMode } = useEditMode()
  const send = useRequestFeedback()
  const [editing, setEditing] = useState<CollaborationInitiative | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const createForm = useRef<InitiativeFormHandle>(null)
  const editForm = useRef<InitiativeFormHandle>(null)

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
        `/api/initiatives${id ? `/${id}` : ''}`,
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
                      isContentPath(initiativeContent, path) ||
                      ['logoUrl', 'websiteUrl'].includes(path),
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

  return (
    <div>
      {editMode && canCreate ? (
        <div className={styles.addCard}>
          <AddItemCard
            label={t('editor.add')}
            size="large"
            onRequestClose={() => createForm.current?.requestCancel()}
          >
            {({ close }) => (
              <InitiativeForm
                ref={createForm}
                busy={busy}
                onCancel={close}
                onSave={(body) => void mutate('POST', undefined, body, close)}
              />
            )}
          </AddItemCard>
        </div>
      ) : null}
      {initiatives.length === 0 ? <p className="content-empty">{t('empty')}</p> : null}
      {initiatives.map((record) => (
        <EditableWrapper
          key={record.id}
          editLabel={t('editor.editNamed', { title: record.title })}
          deleteLabel={t('editor.deleteNamed', { title: record.title })}
          onEdit={
            editMode && canEdit && record.editing && !busy ? () => setEditing(record) : undefined
          }
          onDelete={
            editMode && canDelete && !busy ? () => void mutate('DELETE', record.id) : undefined
          }
          deleteConfirmTitle={t('delete.title')}
          deleteConfirmMessage={t('delete.message')}
          deleteConfirmLabel={t('delete.confirm')}
          deleteCancelLabel={t('editor.cancel')}
        >
          <InitiativeCard initiative={record} />
        </EditableWrapper>
      ))}
      {editing && editMode && canEdit ? (
        <Modal
          open
          title={t('editor.edit')}
          size="large"
          onClose={() => editForm.current?.requestCancel()}
        >
          <InitiativeForm
            key={editing.id}
            ref={editForm}
            initiative={editing}
            busy={busy}
            onCancel={() => setEditing(null)}
            onSave={(body) => void mutate('PATCH', editing.id, body, () => setEditing(null))}
          />
        </Modal>
      ) : null}
    </div>
  )
}
