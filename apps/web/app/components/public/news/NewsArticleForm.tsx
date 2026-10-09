'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
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

  // Standards: Validation & Confirmation States
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  // Compute field errors for display
  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'El título es obligatorio.' : null
  const authorsError =
    hasAttemptedSubmit && splitAuthors(authors).length === 0
      ? 'Debe indicar al menos un autor.'
      : null
  const sourceError =
    hasAttemptedSubmit && source.trim() === '' ? 'La fuente es obligatoria.' : null

  let urlError: string | null = null
  if (hasAttemptedSubmit) {
    if (externalUrl.trim() === '') {
      urlError = 'El enlace es obligatorio.'
    } else {
      try {
        new URL(externalUrl)
      } catch {
        urlError = 'El enlace debe ser una URL válida.'
      }
    }
  }

  const abstractError =
    hasAttemptedSubmit && abstract.trim() === '' ? 'El resumen es obligatorio.' : null

  const hasImage = imageFile !== null || (Boolean(article?.imageUrl) && !imageRemoved)
  const imageError = hasAttemptedSubmit && !hasImage ? 'La imagen es obligatoria.' : null

  const isFormValid =
    title.trim() !== '' &&
    splitAuthors(authors).length > 0 &&
    source.trim() !== '' &&
    externalUrl.trim() !== '' &&
    urlError === null &&
    abstract.trim() !== '' &&
    hasImage

  // Check if form is dirty for discard confirmation
  const isDirty =
    hasAttemptedSubmit ||
    title !== (article?.title ?? '') ||
    authors !== (article?.authors ?? '') ||
    source !== (article?.source ?? '') ||
    publishedAt !== (article?.publishedAt ?? '') ||
    externalUrl !== (article?.href ?? '') ||
    abstract !== (article?.abstract ?? '') ||
    imageAlt !== (article?.imageAlt ?? '') ||
    imageFile !== null ||
    imageRemoved

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      onCancel()
    }
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false)
    onCancel()
  }

  async function handleSave() {
    setHasAttemptedSubmit(true)

    if (!isFormValid) {
      if (title.trim() === '') {
        document.getElementById('news-title-input')?.focus()
      } else if (splitAuthors(authors).length === 0) {
        document.getElementById('news-authors-input')?.focus()
      } else if (source.trim() === '') {
        document.getElementById('news-source-input')?.focus()
      } else if (externalUrl.trim() === '') {
        document.getElementById('news-url-input')?.focus()
      } else if (abstract.trim() === '') {
        document.getElementById('news-abstract-input')?.focus()
      }
      return
    }

    if (isUploading) return

    let imageUrl = imageRemoved ? '' : (article?.imageUrl ?? '')
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
        errorMessage={titleError}
        id="news-title-input"
        label="Título"
        onChange={setTitle}
        required
        validate={requireNonEmpty('El título es obligatorio.')}
        value={title}
      />

      <div className="news-article-form-row">
        <FormField
          errorMessage={authorsError}
          id="news-authors-input"
          label="Autores"
          onChange={setAuthors}
          required
          validate={validateAuthors}
          value={authors}
        />
        <FormField
          errorMessage={sourceError}
          id="news-source-input"
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
          errorMessage={urlError}
          id="news-url-input"
          label="Enlace"
          onChange={setExternalUrl}
          required
          type="url"
          validate={validateExternalUrl}
          value={externalUrl}
        />
      </div>

      <FormField
        errorMessage={abstractError}
        id="news-abstract-input"
        label="Resumen"
        multiline
        onChange={setAbstract}
        required
        validate={requireNonEmpty('El resumen es obligatorio.')}
        value={abstract}
      />
      <FormField label="Texto alternativo de la imagen" onChange={setImageAlt} value={imageAlt} />

      <FileDropInput
        errorMessage={imageError}
        existingImageUrl={imageRemoved ? undefined : article?.imageUrl}
        label="Imagen"
        onFileSelect={(file) => {
          setImageFile(file)
          setImageRemoved(file === null)
        }}
        required
      />

      {uploadError ? <p className="form-alert">{uploadError}</p> : null}

      <div className="news-article-form-actions">
        <Button disabled={isUploading} onClick={handleCancelClick} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isUploading} onClick={handleSave} variant="primary">
          {isUploading ? (
            <>
              <Loader2 aria-hidden="true" className="btn-spinner" size={16} />
              <span>Subiendo imagen...</span>
            </>
          ) : (
            'Confirmar'
          )}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        message="Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados."
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="warning"
        title="Descartar cambios no guardados"
      />
    </div>
  )
}
