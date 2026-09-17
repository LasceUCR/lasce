'use client'

import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
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

  const hasImage = imageFile !== null || (Boolean(article?.imageUrl) && !imageRemoved)
  const canSave =
    title.trim() !== '' &&
    splitAuthors(authors).length > 0 &&
    source.trim() !== '' &&
    externalUrl.trim() !== '' &&
    abstract.trim() !== '' &&
    hasImage

  function handleSave() {
    if (!canSave) return

    // Left as-is on purpose (LASCE-CMS-002): a freshly dropped file becomes a local object URL
    // that only lasts for this browser session, standing in for a real upload until
    // `apps/web/app/services/storage` is finished.
    const imageUrl = imageFile ? URL.createObjectURL(imageFile) : (article?.imageUrl ?? '')

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
      <FormField label="Título" onChange={setTitle} required value={title} />

      <div className="news-article-form-row">
        <FormField label="Autores" onChange={setAuthors} required value={authors} />
        <FormField label="Fuente" onChange={setSource} required value={source} />
      </div>

      <div className="news-article-form-row">
        <FormField label="Fecha" onChange={setPublishedAt} type="date" value={publishedAt} />
        <FormField
          label="Enlace"
          onChange={setExternalUrl}
          required
          type="url"
          value={externalUrl}
        />
      </div>

      <FormField label="Resumen" multiline onChange={setAbstract} required value={abstract} />
      <FormField label="Texto alternativo de la imagen" onChange={setImageAlt} value={imageAlt} />
      <FileDropInput
        existingImageUrl={article?.imageUrl}
        label="Imagen"
        onFileSelect={(file) => {
          setImageFile(file)
          setImageRemoved(file === null)
        }}
      />

      <div className="news-article-form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={!canSave} onClick={handleSave} variant="primary">
          Confirmar
        </Button>
      </div>
    </div>
  )
}
