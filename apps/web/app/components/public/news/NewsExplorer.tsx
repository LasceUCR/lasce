'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { SearchBar } from '@/app/components/public/SearchBar'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { NewsArticle } from '@/app/lib/news'

import { EditableNewsCard } from './EditableNewsCard'
import { NewsArticleForm, type NewsArticleFormValues } from './NewsArticleForm'

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

export interface NewsExplorerProps {
  news: NewsArticle[]
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

async function errorFromResponse(response: Response): Promise<string> {
  const body: { error?: string } | null = await response.json().catch(() => null)
  return body?.error ?? SAVE_ERROR_MESSAGE
}

export function NewsExplorer({ news }: NewsExplorerProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
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

  async function handleSave(id: string, values: NewsArticleFormValues): Promise<string | null> {
    let response: Response
    try {
      response = await fetch(`/api/news/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      return SAVE_ERROR_MESSAGE
    }

    if (!response.ok) {
      return errorFromResponse(response)
    }

    // Re-runs the server component's `getNews()` so the page reflects the saved change
    // immediately, without an optimistic guess.
    router.refresh()
    return null
  }

  async function handleCreate(values: NewsArticleFormValues, close: () => void) {
    setCreateError(null)

    let response: Response
    try {
      response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      setCreateError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      setCreateError(await errorFromResponse(response))
      return
    }

    close()
    router.refresh()
  }

  async function handleDelete(id: string) {
    setListError(null)

    let response: Response
    try {
      response = await fetch(`/api/news/${id}`, { method: 'DELETE' })
    } catch {
      setListError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      setListError(await errorFromResponse(response))
      return
    }

    router.refresh()
  }

  return (
    <section aria-labelledby="news-title" className="news page-width">
      <SearchBar
        label="Buscar noticias"
        onQueryChange={setQuery}
        placeholder="Buscar por título, autor o palabra clave..."
        query={query}
      />

      <h2 id="news-title">Noticias recientes</h2>

      {hasQuery ? (
        <p aria-live="polite" className="sr-only">
          {filtered.length === 1
            ? 'Se encontró 1 noticia.'
            : `Se encontraron ${filtered.length} noticias.`}
        </p>
      ) : null}

      {listError ? <p className="form-alert">{listError}</p> : null}

      {filtered.length === 0 && !editMode ? (
        <p className="content-empty" role="status">
          {hasQuery
            ? `No se encontraron noticias para “${query}”.`
            : 'No hay noticias publicadas todavía.'}
        </p>
      ) : (
        <div className="news-list">
          {editMode && (
            <AddItemCard label="Agregar noticia" size="large">
              {({ close }) => (
                <>
                  {createError ? <p className="form-alert">{createError}</p> : null}
                  <NewsArticleForm
                    article={null}
                    onCancel={() => {
                      setCreateError(null)
                      close()
                    }}
                    onSave={(values) => handleCreate(values, close)}
                  />
                </>
              )}
            </AddItemCard>
          )}

          {filtered.map((article) => (
            <EditableNewsCard
              article={article}
              key={article.slug}
              onDelete={() => handleDelete(article.slug)}
              onSave={(values) => handleSave(article.slug, values)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
