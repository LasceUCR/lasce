'use client'

import { useState } from 'react'

import { Modal } from '@/app/components/public/Modal'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { NewsArticle } from '@/app/lib/news'

import { NewsArticleForm } from './NewsArticleForm'
import { NewsCard } from './NewsCard'

export interface EditableNewsCardProps {
  article: NewsArticle
  onSave: (article: NewsArticle) => void
  onDelete: () => void
}

/**
 * The one piece that knows both about `NewsArticle` and about "Modo
 * edición" — `NewsCard`, `EditableWrapper` and `NewsArticleForm` stay
 * unaware of each other and of the toggle.
 */
export function EditableNewsCard({ article, onSave, onDelete }: EditableNewsCardProps) {
  const { editMode } = useEditMode()
  const [isEditing, setIsEditing] = useState(false)

  const card = <NewsCard {...article} />

  const editModal = (
    <Modal onClose={() => setIsEditing(false)} open={isEditing} title="Editar noticia">
      <NewsArticleForm
        article={article}
        onCancel={() => setIsEditing(false)}
        onSave={(updated) => {
          onSave(updated)
          setIsEditing(false)
        }}
      />
    </Modal>
  )

  if (!editMode) {
    return card
  }

  return (
    <>
      <EditableWrapper
        deleteConfirmMessage={`¿Desea eliminar "${article.title}"? Esta acción no se puede deshacer.`}
        deleteConfirmTitle="Eliminar noticia"
        onDelete={onDelete}
        onEdit={() => setIsEditing(true)}
      >
        {card}
      </EditableWrapper>
      {editModal}
    </>
  )
}
