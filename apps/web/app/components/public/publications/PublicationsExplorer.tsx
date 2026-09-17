'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicationCard } from './PublicationCard'
import { SearchBar } from '@/app/components/public/SearchBar'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { Publication, ResearchGroup } from '@/app/lib/publications'

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

export interface PublicationsExplorerProps {
  publications: Publication[]
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

export function PublicationsExplorer({ publications }: PublicationsExplorerProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const [query, setQuery] = useState('')

  const [selectedGroup, setSelectedGroup] = useState<ResearchGroup | null>(null)


  function openEditor(id: string) {
    setSaveError(null)
    setEditingActivityId(id)
  }

  function closeEditor() {
    setSaveError(null)
    setEditingActivityId(null)
  }

  async function handleSaveActivity() {
  }

  async function handleCreateActivity() {
  }

  async function handleDeleteActivity() {
  }

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

        <div
          aria-label="Filtrar por grupo de investigación"
          className="publications-group-filters"
          role="group"
        >
          <button
            aria-pressed={selectedGroup === 'LASCE'}
            onClick={() => setSelectedGroup(selectedGroup === 'LASCE' ? null : 'LASCE')}
            type="button"
          >
            LASCE
          </button>

          <button
            aria-pressed={selectedGroup === 'ROSAC'}
            onClick={() => setSelectedGroup(selectedGroup === 'ROSAC' ? null : 'ROSAC')}
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
          {filtered.map((publication) => {

            if (!editMode) { return (
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
            )}

            return (
            <EditableWrapper key={publication.slug}
              deleteConfirmMessage={`¿Desea eliminar "${publication.title}"? Esta acción no se puede deshacer.`}
              deleteConfirmTitle="Eliminar actividad"
              onDelete={() => handleDeleteActivity()}
              onEdit={() => openEditor(publication.slug)}>
                
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
            </EditableWrapper>
            )
          })}
        </div>
      )}
    </section>
  )
}
