'use client'

import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import type { NewsArticle } from '@/app/lib/news'

export interface NewsArticleFormProps {
  /** `null` starts a blank form for a new article. */
  article: NewsArticle | null
  onSave: (article: NewsArticle) => void
  onCancel: () => void
}

function isCombiningMark(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0
  return codePoint >= 0x0300 && codePoint <= 0x036f
}

function slugify(title: string): string {
  const base = Array.from(title.normalize('NFD'))
    .filter((char) => !isCombiningMark(char))
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${base || 'noticia'}-${Date.now()}`
}

export function NewsArticleForm({ article, onSave, onCancel }: NewsArticleFormProps) {
  const [title, setTitle] = useState(article?.title ?? '')
  const [authors, setAuthors] = useState(article?.authors ?? '')
  const [source, setSource] = useState(article?.source ?? '')
  const [date, setDate] = useState(article?.date ?? '')
  const [href, setHref] = useState(article?.href ?? '')
  const [abstract, setAbstract] = useState(article?.abstract ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)

  const hasImage = imageFile !== null || (Boolean(article?.imageUrl) && !imageRemoved)
  const canSave = title.trim() !== '' && hasImage

  function handleSave() {
    if (!canSave) return

    // No backend yet: a freshly dropped file becomes a local object URL that
    // only lasts for this browser session, standing in for a real upload.
    const imageUrl = imageFile ? URL.createObjectURL(imageFile) : (article?.imageUrl ?? '')

    onSave({
      slug: article?.slug ?? slugify(title),
      title,
      authors,
      source,
      date,
      href,
      abstract,
      imageUrl,
    })
  }

  return (
    <div className="news-article-form">
      <FormField label="Título" onChange={setTitle} required value={title} />

      <div className="news-article-form-row">
        <FormField label="Autores" onChange={setAuthors} value={authors} />
        <FormField label="Fuente" onChange={setSource} value={source} />
      </div>

      <div className="news-article-form-row">
        <FormField label="Fecha" onChange={setDate} value={date} />
        <FormField label="Enlace" onChange={setHref} type="url" value={href} />
      </div>

      <FormField label="Resumen" multiline onChange={setAbstract} value={abstract} />
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
