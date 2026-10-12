'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

import { SearchBar } from '@/app/components/public/SearchBar'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import type { NewsArticle } from '@/app/lib/news'

import { EditableNewsCard } from './EditableNewsCard'
import { NewsArticleForm, type NewsArticleFormValues } from './NewsArticleForm'

export interface NewsExplorerProps {
  news: NewsArticle[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

function jsonRequest(method: 'POST' | 'PATCH', values: NewsArticleFormValues): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  }
}

export function NewsExplorer({
  news,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: NewsExplorerProps) {
  const router = useRouter()
  const t = useTranslations('news')
  const sendWithFeedback = useRequestFeedback()
  const [query, setQuery] = useState('')
  const { editMode } = useEditMode()

  const filtered = useMemo(() => {
    if (query.trim() === '') {
      return news
    }

    return news.filter(
      (article) =>
        matches(article.title, query) ||
        matches(article.authors, query) ||
        matches(article.source, query) ||
        matches(article.abstract, query),
    )
  }, [news, query])

  const hasQuery = query.trim() !== ''

  // Each handler reports its outcome in a toast through `useRequestFeedback`. On failure nothing
  // else happens: the form stays open with the admin's input and the list is not refreshed.
  // `router.refresh()` re-runs the server component's `getNews()` so the list reflects a saved
  // change immediately, without an optimistic guess.

  async function handleSave(id: string, values: NewsArticleFormValues, close: () => void) {
    await sendWithFeedback(`/api/news/${id}`, jsonRequest('PATCH', values), {
      success: t('updated'),
      fallback: t('errors.saveUnknown'),
      onSuccess: () => {
        close()
        router.refresh()
      },
    })
  }

  async function handleCreate(values: NewsArticleFormValues, close: () => void) {
    await sendWithFeedback('/api/news', jsonRequest('POST', values), {
      success: t('created'),
      fallback: t('errors.saveUnknown'),
      onSuccess: () => {
        close()
        router.refresh()
      },
    })
  }

  async function handleDelete(id: string) {
    await sendWithFeedback(
      `/api/news/${id}`,
      { method: 'DELETE' },
      {
        success: t('deleted'),
        fallback: t('errors.deleteUnknown'),
        onSuccess: () => router.refresh(),
      },
    )
  }

  return (
    <section aria-labelledby="news-title" className="news page-width">
      <h2 id="news-title">Noticias recientes</h2>

      <SearchBar
        label="Buscar noticias"
        onQueryChange={setQuery}
        placeholder="Buscar por título, autor o palabra clave..."
        query={query}
      />

      {hasQuery ? (
        <p aria-live="polite" className="sr-only">
          {filtered.length === 1
            ? 'Se encontró 1 noticia.'
            : `Se encontraron ${filtered.length} noticias.`}
        </p>
      ) : null}

      {filtered.length === 0 && !editMode ? (
        <p className="content-empty" role="status">
          {hasQuery
            ? `No se encontraron noticias para “${query}”.`
            : 'No hay noticias publicadas todavía.'}
        </p>
      ) : (
        <div className="news-list">
          {editMode && canCreate && (
            <AddItemCard label="Agregar noticia" size="large">
              {({ close }) => (
                <NewsArticleForm
                  article={null}
                  onCancel={close}
                  onSave={(values) => handleCreate(values, close)}
                />
              )}
            </AddItemCard>
          )}

          {filtered.map((article) => (
            <EditableNewsCard
              article={article}
              canDelete={canDelete}
              canEdit={canEdit}
              key={article.slug}
              onDelete={() => handleDelete(article.slug)}
              onSave={(values, close) => handleSave(article.slug, values, close)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
