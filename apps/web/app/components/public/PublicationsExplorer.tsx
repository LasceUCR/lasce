'use client'

import { useMemo, useState } from 'react'

import { PublicationCard } from './PublicationCard'
import { PublicationSearchBar } from './PublicationSearchBar'
import type { Publication } from '@/app/lib/publications'

export interface PublicationsExplorerProps {
  publications: Publication[]
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

export function PublicationsExplorer({ publications }: PublicationsExplorerProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (query.trim() === '') {
      return publications
    }

    return publications.filter(
      (publication) =>
        matches(publication.title, query) ||
        matches(publication.authors, query) ||
        matches(publication.abstract, query),
    )
  }, [publications, query])

  return (
    <section aria-labelledby="publications-title" className="publications page-width">
      <PublicationSearchBar onQueryChange={setQuery} query={query} />

      <h2 id="publications-title">Publicaciones recientes</h2>

      {filtered.length === 0 ? (
        <p className="content-empty" role="status">
          No se encontraron publicaciones para “{query}”.
        </p>
      ) : (
        <div className="publication-list">
          {filtered.map((publication) => (
            <PublicationCard
              abstract={publication.abstract}
              authors={publication.authors}
              href={publication.href}
              key={publication.slug}
              title={publication.title}
              venue={publication.venue}
              year={publication.year}
            />
          ))}
        </div>
      )}
    </section>
  )
}
