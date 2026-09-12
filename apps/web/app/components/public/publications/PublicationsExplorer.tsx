'use client'

import { useMemo, useState } from 'react'

import { PublicationCard } from './PublicationCard'
import { SearchBar } from '@/app/components/public/SearchBar'
import type { Publication, ResearchGroup } from '@/app/lib/publications'

export interface PublicationsExplorerProps {
  publications: Publication[]
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

export function PublicationsExplorer({ publications }: PublicationsExplorerProps) {
  const [query, setQuery] = useState('')

  const [selectedGroup, setSelectedGroup] = useState<ResearchGroup | null>(null)

  const filtered = useMemo(() => {
    return publications.filter((publication) => {
      const matchesGroup =
        selectedGroup === null || publication.researchGroup === selectedGroup

      const matchesSearch =
        query.trim() === '' ||
        matches(publication.title, query) ||
        matches(publication.authors, query) ||
        matches(publication.abstract, query)

      return matchesGroup && matchesSearch
    })
  }, [publications, query, selectedGroup])

  function getEmptyMessage() {
    if (selectedGroup !== null && query.trim() !== '') {
      return `No se encontraron publicaciones de ${selectedGroup} para “${query}”.`
    }

    if (selectedGroup !== null) {
      return `No hay publicaciones de ${selectedGroup}.`
    }

    if (query.trim() !== '') {
      return `No se encontraron publicaciones para “${query}”.`
    }

    return 'No hay publicaciones disponibles.'
  }

  return (
    <section aria-labelledby="publications-title" className="publications page-width">
      <div className="publications-toolbar">
        <SearchBar
          className="publications-search"
          label="Buscar publicaciones"
          onQueryChange={setQuery}
          placeholder="Buscar por título, autor o palabra clave..."
          query={query}
        />

        <div
          aria-label="Filtrar por grupo de investigación"
          className="publications-group-filters"
          role="group"
        >
          <button
            aria-pressed={selectedGroup === 'LASCE'}
            onClick={() =>
              setSelectedGroup(selectedGroup === 'LASCE' ? null : 'LASCE')
            }
            type="button"
          >
            LASCE
          </button>

          <button
            aria-pressed={selectedGroup === 'ROSAC'}
            onClick={() =>
              setSelectedGroup(selectedGroup === 'ROSAC' ? null : 'ROSAC')
            }
            type="button"
          >
            ROSAC
          </button>
        </div>
      </div>

      <h2 id="publications-title">Publicaciones recientes</h2>

      {filtered.length === 0 ? (
        <p className="content-empty" role="status">
          {getEmptyMessage()}
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
