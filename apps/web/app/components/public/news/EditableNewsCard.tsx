'use client'

import { useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { NewsArticle } from '@/app/lib/news'

import { NewsArticleForm, type NewsArticleFormValues } from './NewsArticleForm'
import { NewsCard } from './NewsCard'

export interface EditableNewsCardProps {
  article: NewsArticle
  canEdit?: boolean
  canDelete?: boolean
  /**
   * Persists the edit. Calls `close` once it is saved, so the modal shuts before any success
   * message; on failure it leaves the modal open with the admin's input and reports the reason
   * itself (a toast, which renders inside the open modal).
   */
  onSave: (values: NewsArticleFormValues, close: () => void) => void | Promise<void>
  onDelete: () => void
}

/**
 * The one piece that knows both about `NewsArticle` and about "Modo
 * edición" — `NewsCard`, `EditableWrapper` and `NewsArticleForm` stay
 * unaware of each other and of the toggle.
 */
export function EditableNewsCard({
  article,
  canEdit = false,
  canDelete = false,
  onSave,
  onDelete,
}: EditableNewsCardProps) {
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)

  const card = <NewsCard {...article} detailHref={`/noticias/${article.slug}`} />

  function close() {
    setIsEditing(false)
  }

  const editModal = (
    <Modal onClose={close} open={isEditing} size="large" title="Editar noticia">
      <NewsArticleForm
        article={article}
        onCancel={close}
        onSave={(values) => onSave(values, close)}
      />
    </Modal>
  )

  const showEditor = editMode && (canEdit || canDelete)

  if (!showEditor) {
    return card
  }

  return (
    <>
      <EditableWrapper
        deleteConfirmMessage="Esta acción no se puede deshacer y borrará la noticia del catálogo público."
        deleteConfirmTitle="Eliminar noticia"
        onDelete={canDelete ? onDelete : undefined}
        onEdit={canEdit ? () => setIsEditing(true) : undefined}
      >
        {card}
      </EditableWrapper>
      {editModal}
    </>
  )
}
