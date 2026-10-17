'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import { initialFromArticle, type NewsDraft, type NewsFormInitial } from '@/app/lib/news-form'
import type { NewsArticle, ReviewConfirmation } from '@/app/lib/news-schema'

import { NewsArticleForm, type NewsArticleFormHandle } from './NewsArticleForm'
import { NewsCard } from './NewsCard'

export interface EditableNewsCardProps {
  article: NewsArticle
  canEdit?: boolean
  canDelete?: boolean
  /** True while a save or delete is in flight. */
  busy?: boolean
  /**
   * Persists the edit made from `initial`. Calls `close` once it is saved, so the modal shuts
   * before any success message; on failure it leaves the modal open with the admin's input and
   * reports the reason itself (a toast, which renders inside the open modal).
   */
  onSave: (
    initial: NewsFormInitial,
    draft: NewsDraft,
    confirmed: ReviewConfirmation[],
    close: () => void,
  ) => void | Promise<void>
  onDelete: () => void
}

/**
 * The one piece that knows both about `NewsArticle` and about "Modo edición": `NewsCard`,
 * `EditableWrapper` and `NewsArticleForm` stay unaware of each other and of the toggle.
 */
export function EditableNewsCard({
  article,
  canEdit = false,
  canDelete = false,
  busy = false,
  onSave,
  onDelete,
}: EditableNewsCardProps) {
  const t = useTranslations('news')
  const { editMode } = useEditMode()
  // Taken when the editor opens, so a refresh behind it cannot change what it saves against.
  const [editing, setEditing] = useState<NewsFormInitial | null>(null)
  const form = useRef<NewsArticleFormHandle>(null)

  const card = (
    <NewsCard
      abstract={article.abstract}
      authors={article.authors}
      contentLang={contentLangAttribute(article.contentLocale)}
      date={article.date}
      href={article.href}
      publishedAt={article.publishedAt}
      source={article.source}
      title={article.title}
      translationMissing={editMode && article.editing?.isLegacy === true}
    />
  )

  const showEditor = editMode && (canEdit || canDelete)

  if (!showEditor) {
    return card
  }

  function close() {
    setEditing(null)
  }

  return (
    <>
      <EditableWrapper
        deleteCancelLabel={t('deleteDialog.cancel')}
        deleteConfirmLabel={t('deleteDialog.confirm')}
        deleteConfirmMessage={t('deleteDialog.message', { title: article.title })}
        deleteConfirmTitle={t('deleteDialog.title')}
        deleteLabel={t('editor.deleteLabel', { title: article.title })}
        editLabel={t('editor.editLabel', { title: article.title })}
        onDelete={canDelete && !busy ? onDelete : undefined}
        onEdit={canEdit && !busy ? () => setEditing(initialFromArticle(article)) : undefined}
      >
        {card}
      </EditableWrapper>

      <Modal
        onClose={() => {
          if (form.current) form.current.requestCancel()
          else close()
        }}
        open={editing !== null}
        size="large"
        title={t('editor.editTitle')}
      >
        {editing ? (
          <NewsArticleForm
            busy={busy}
            initial={editing}
            onCancel={close}
            onSave={(draft, confirmed) => onSave(editing, draft, confirmed, close)}
            ref={form}
          />
        ) : null}
      </Modal>
    </>
  )
}
