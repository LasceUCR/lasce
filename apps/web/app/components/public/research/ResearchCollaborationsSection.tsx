'use client'

import { useMemo, useState } from 'react'

import { CollaborationCard } from './CollaborationCard'
import { SearchBar } from '@/app/components/public/SearchBar'
import { Select } from '@/app/components/public/Select'
import type { CollaborationScope, ResearchCollaboration } from '@/app/lib/research-collaborations'

export interface ResearchCollaborationsSectionProps {
  id?: string
  collaborations: ResearchCollaboration[]
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

export function ResearchCollaborationsSection({
  id = 'research-collaborations',
  collaborations,
}: ResearchCollaborationsSectionProps) {
  const [query, setQuery] = useState('')
  const [selectedScope, setSelectedScope] = useState<CollaborationScope | 'all'>('all')

  const filtered = useMemo(() => {
    return collaborations.filter((collaboration) => {
      const matchesScope = selectedScope === 'all' || collaboration.scope === selectedScope
      const matchesQuery =
        query.trim() === '' ||
        matches(collaboration.name, query) ||
        (collaboration.acronym ? matches(collaboration.acronym, query) : false) ||
        matches(collaboration.country, query)

      return matchesScope && matchesQuery
    })
  }, [collaborations, query, selectedScope])

  function getKpiText() {
    if (selectedScope === 'national') {
      return filtered.length === 1 ? 'colaboración nacional' : 'colaboraciones nacionales'
    }
    if (selectedScope === 'international') {
      return filtered.length === 1 ? 'colaboración internacional' : 'colaboraciones internacionales'
    }
    return filtered.length === 1 ? 'colaboración en total' : 'colaboraciones en total'
  }

  function getEmptyMessage() {
    if (collaborations.length === 0) {
      return 'No hay información de colaboraciones disponible actualmente.'
    }
    if (selectedScope !== 'all' && query.trim() !== '') {
      const scopeLabel = selectedScope === 'national' ? 'nacionales' : 'internacionales'
      return `No se encontraron colaboraciones ${scopeLabel} para “${query}”.`
    }
    if (selectedScope !== 'all') {
      const scopeLabel = selectedScope === 'national' ? 'nacionales' : 'internacionales'
      return `No hay colaboraciones ${scopeLabel} disponibles.`
    }
    if (query.trim() !== '') {
      return `No se encontraron colaboraciones para “${query}”.`
    }
    return 'No hay información de colaboraciones disponible actualmente.'
  }

  return (
    <section
      aria-labelledby="collaborations-title"
      className="research-collaborations page-width"
      id={id}
    >
      <div className="section-heading">
        <h2 id="collaborations-title">Colaboraciones de investigación</h2>
        <p className="research-collaborations-description">
          Organizaciones y grupos que colaboran con el LASCE en investigación y desarrollo
          científico a nivel nacional e internacional.
        </p>
      </div>

      <div className="collaborations-toolbar">
        <SearchBar
          className="collaborations-search"
          label="Buscar colaboraciones"
          onQueryChange={setQuery}
          placeholder="Buscar por institución, siglas o país..."
          query={query}
        />

        <div className="collaborations-scope-filter">
          <Select
            id="collaboration-scope-filter"
            label="Tipo de colaboración"
            onChange={(value) => setSelectedScope(value as CollaborationScope | 'all')}
            options={[
              { value: 'all', label: 'Todas las colaboraciones' },
              { value: 'national', label: 'Nacionales' },
              { value: 'international', label: 'Internacionales' },
            ]}
            value={selectedScope}
          />
        </div>

        <div
          aria-label="Cantidad de colaboraciones"
          aria-live="polite"
          className="collaborations-kpi"
        >
          <strong>{filtered.length}</strong>
          <span>{getKpiText()}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="content-empty" role="status">
          {getEmptyMessage()}
        </p>
      ) : (
        <div className="collaborations-grid">
          {filtered.map((collaboration) => (
            <CollaborationCard
              acronym={collaboration.acronym}
              country={collaboration.country}
              key={collaboration.id}
              name={collaboration.name}
              scope={collaboration.scope}
            />
          ))}
        </div>
      )}
    </section>
  )
}
