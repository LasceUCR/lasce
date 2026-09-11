'use client'

import { useMemo, useState } from 'react'

import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import { SearchBar } from '@/app/components/public/SearchBar'
import type { NewsArticle } from '@/app/lib/news'

import { EditableNewsCard } from './EditableNewsCard'
import { NewsArticleForm } from './NewsArticleForm'

export interface NewsExplorerProps {
  news: NewsArticle[]
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

export function NewsExplorer({ news }: NewsExplorerProps) {
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState(news)
  const { editMode } = useEditMode()

  const filtered = useMemo(() => {
    if (query.trim() === '') {
      return articles
    }

    return articles.filter(
      (article) =>
        matches(article.title, query) ||
        matches(article.authors, query) ||
        matches(article.source, query) ||
        matches(article.abstract, query),
    )
  }, [articles, query])

  function handleSave(updated: NewsArticle) {
    setArticles((current) => {
      const exists = current.some((article) => article.slug === updated.slug)
      return exists
        ? current.map((article) => (article.slug === updated.slug ? updated : article))
        : [updated, ...current]
    })
  }

  function handleDelete(slug: string) {
    setArticles((current) => current.filter((article) => article.slug !== slug))
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

      {filtered.length === 0 && !editMode ? (
        <p className="content-empty" role="status">
          {query.trim() === '' ? (
            'No hay noticias publicadas todavía.'
          ) : (
            <>No se encontraron noticias para “{query}”.</>
          )}
        </p>
      ) : (
        <div className="news-list">
          {filtered.map((article) => (
            <EditableNewsCard
              article={article}
              key={article.slug}
              onDelete={() => handleDelete(article.slug)}
              onSave={handleSave}
            />
          ))}

          {editMode && (
            <AddItemCard label="Agregar noticia">
              {({ close }) => (
                <NewsArticleForm
                  article={null}
                  onCancel={close}
                  onSave={(article) => {
                    handleSave(article)
                    close()
                  }}
                />
              )}
            </AddItemCard>
          )}
        </div>
      )}
    </section>
  )
}
