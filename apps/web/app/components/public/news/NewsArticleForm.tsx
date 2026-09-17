'use client'

import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { uploadNewsImage, type UploadNewsImageResult } from '@/app/(public)/noticias/actions'
import type { NewsArticle } from '@/app/lib/news'

/** The editable fields of a news article, as `/api/news` expects them. */
export interface NewsArticleFormValues {
  title: string
  authors: string[]
  source: string
  publishedAt: string | null
  externalUrl: string
  abstract: string
  imageUrl: string
  imageAlt: string
}

export interface NewsArticleFormProps {
  /** `null` starts a blank form for a new article. */
  article: NewsArticle | null
  onSave: (values: NewsArticleFormValues) => void
  onCancel: () => void
}

function splitAuthors(value: string): string[] {
  return value
    .split(',')
    .map((author) => author.trim())
    .filter((author) => author !== '')
}

/** Messages match `newsInputSchema` (apps/web/app/lib/news.ts) so a rejection reads the same
 * whether it's caught here, on blur, or by the server after submission. */
function requireNonEmpty(message: string) {
  return (value: string) => {
    if (value.trim() === '') throw new Error(message)
  }
}

function validateAuthors(value: string) {
  if (splitAuthors(value).length === 0) throw new Error('Debe indicar al menos un autor.')
}

function validateExternalUrl(value: string) {
  if (value.trim() === '') throw new Error('El enlace debe ser una URL válida.')
  try {
    new URL(value)
  } catch {
    throw new Error('El enlace debe ser una URL válida.')
  }
}

export function NewsArticleForm({ article, onSave, onCancel }: NewsArticleFormProps) {
  const [title, setTitle] = useState(article?.title ?? '')
  const [authors, setAuthors] = useState(article?.authors ?? '')
  const [source, setSource] = useState(article?.source ?? '')
  const [publishedAt, setPublishedAt] = useState(article?.publishedAt ?? '')
  const [externalUrl, setExternalUrl] = useState(article?.href ?? '')
  const [abstract, setAbstract] = useState(article?.abstract ?? '')
  const [imageAlt, setImageAlt] = useState(article?.imageAlt ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const hasImage = imageFile !== null || (Boolean(article?.imageUrl) && !imageRemoved)
  const canSave =
    title.trim() !== '' &&
    splitAuthors(authors).length > 0 &&
    source.trim() !== '' &&
    externalUrl.trim() !== '' &&
    abstract.trim() !== '' &&
    hasImage

  async function handleSave() {
    if (!canSave || isUploading) return

    let imageUrl = article?.imageUrl ?? ''
    if (imageFile) {
      setUploadError(null)
      setIsUploading(true)

      let result: UploadNewsImageResult
      try {
        const formData = new FormData()
        formData.set('file', imageFile)
        result = await uploadNewsImage(formData)
      } catch {
        setIsUploading(false)
        setUploadError('No se pudo subir la imagen. Inténtelo de nuevo.')
        return
      }
      setIsUploading(false)

      if (!result.ok) {
        setUploadError(result.error)
        return
      }
      imageUrl = result.imageUrl
    }

    onSave({
      title,
      authors: splitAuthors(authors),
      source,
      publishedAt: publishedAt === '' ? null : publishedAt,
      externalUrl,
      abstract,
      imageUrl,
      imageAlt,
    })
  }

  return (
    <div className="news-article-form">
      <FormField
        label="Título"
        onChange={setTitle}
        required
        validate={requireNonEmpty('El título es obligatorio.')}
        value={title}
      />

      <div className="news-article-form-row">
        <FormField
          label="Autores"
          onChange={setAuthors}
          required
          validate={validateAuthors}
          value={authors}
        />
        <FormField
          label="Fuente"
          onChange={setSource}
          required
          validate={requireNonEmpty('La fuente es obligatoria.')}
          value={source}
        />
      </div>

      <div className="news-article-form-row">
        <FormField label="Fecha" onChange={setPublishedAt} type="date" value={publishedAt} />
        <FormField
          label="Enlace"
          onChange={setExternalUrl}
          required
          type="url"
          validate={validateExternalUrl}
          value={externalUrl}
        />
      </div>

      <FormField
        label="Resumen"
        multiline
        onChange={setAbstract}
        required
        validate={requireNonEmpty('El resumen es obligatorio.')}
        value={abstract}
      />
      <FormField label="Texto alternativo de la imagen" onChange={setImageAlt} value={imageAlt} />
      <FileDropInput
        existingImageUrl={article?.imageUrl}
        label="Imagen"
        onFileSelect={(file) => {
          setImageFile(file)
          setImageRemoved(file === null)
        }}
      />

      {uploadError ? <p className="form-alert">{uploadError}</p> : null}

      <div className="news-article-form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={!canSave || isUploading} onClick={handleSave} variant="primary">
          {isUploading ? 'Subiendo imagen...' : 'Confirmar'}
        </Button>
      </div>
    </div>
  )
}
