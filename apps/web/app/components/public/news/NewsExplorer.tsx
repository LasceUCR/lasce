'use client'

import { useMemo, useState } from 'react'

import { SearchBar } from '@/app/components/public/SearchBar'
import type { NewsArticle } from '@/app/lib/news'

import { NewsCard } from './NewsCard'

export interface NewsExplorerProps {
  news: NewsArticle[]
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

export function NewsExplorer({ news }: NewsExplorerProps) {
  const [query, setQuery] = useState('')

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

      {filtered.length === 0 ? (
        <p className="content-empty" role="status">
          {hasQuery
            ? `No se encontraron noticias para “${query}”.`
            : 'No hay noticias publicadas todavía.'}
        </p>
      ) : (
        <div className="news-list">
          {filtered.map((article) => (
            <NewsCard
              abstract={article.abstract}
              authors={article.authors}
              date={article.date}
              href={article.href}
              imageUrl={article.imageUrl}
              key={article.slug}
              source={article.source}
              title={article.title}
              imageAlt={article.imageAlt}
            />
          ))}
        </div>
      )}
    </section>
  )
}
