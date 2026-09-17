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
  /** Persists the edit; resolves to an error message on failure, or `null` on success. */
  onSave: (values: NewsArticleFormValues) => Promise<string | null>
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
  const [saveError, setSaveError] = useState<string | null>(null)

  const card = <NewsCard {...article} />

  async function handleFormSave(values: NewsArticleFormValues) {
    const error = await onSave(values)
    if (error) {
      setSaveError(error)
      return
    }
    setSaveError(null)
    setIsEditing(false)
  }

  const editModal = (
    <Modal
      onClose={() => {
        setSaveError(null)
        setIsEditing(false)
      }}
      open={isEditing}
      size="large"
      title="Editar noticia"
    >
      {saveError ? <p className="form-alert">{saveError}</p> : null}
      <NewsArticleForm
        article={article}
        onCancel={() => {
          setSaveError(null)
          setIsEditing(false)
        }}
        onSave={handleFormSave}
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
