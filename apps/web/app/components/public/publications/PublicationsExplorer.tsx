'use client'

import { useMemo, useState } from 'react'

import { PublicationCard } from './PublicationCard'
import { Select } from '@/app/components/public/Select'
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
      const matchesGroup = selectedGroup === null || publication.researchGroup === selectedGroup

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

        <div className="publications-group-filter">
          <Select
            id="publication-research-group"
            label="Grupo de investigación"
            onChange={(value) =>
              setSelectedGroup(value === '' ? null : (value as ResearchGroup))
            }
            options={[
              { value: '', label: 'Todas las publicaciones' },
              { value: 'LASCE', label: 'LASCE' },
              { value: 'ROSAC', label: 'ROSAC' },
            ]}
            value={selectedGroup ?? ''}
          />
        </div>

        <div
          aria-label="Cantidad de publicaciones"
          aria-live="polite"
          className="publications-kpi"
        >
          <strong>{filtered.length}</strong>
          <span>
            {selectedGroup
              ? `publicaciones (${selectedGroup})`
              : 'publicaciones en total'}
          </span>
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
              researchGroup={publication.researchGroup}
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
