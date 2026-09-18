'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicationCard } from './PublicationCard'
import { Select } from '@/app/components/public/Select'
import { SearchBar } from '@/app/components/public/SearchBar'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { Publication, ResearchGroup } from '@/app/lib/publications'
import { Modal } from '@/app/components/public/Modal'
import { PublicationForm, type PublicationFormValues } from './PublicationForm'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

export interface PublicationsExplorerProps {
  publications: Publication[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

/**
 * Blank starting point for a new publication.
 */
const blankPublication: PublicationFormValues = {
  abstract: '',
  authors: [],
  DOI: '',
  researchGroup: 'LASCE',
  title: '',
  venue: '',
  date: new Date(),
}

export function PublicationsExplorer({
  publications,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: PublicationsExplorerProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const [editingPublicationId, setEditingPublicationId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const [query, setQuery] = useState('')

  const [selectedGroup, setSelectedGroup] = useState<ResearchGroup | null>(null)

  const editingPublication = publications.find(
    (publication) => publication.slug === editingPublicationId,
  )

  function openEditor(id: string) {
    setSaveError(null)
    setEditingPublicationId(id)
  }

  function closeEditor() {
    setSaveError(null)
    setEditingPublicationId(null)
  }

  async function handleSavePublication(values: PublicationFormValues) {
    if (!editingPublicationId) return

    let response: Response

    try {
      response = await fetch(`/api/publicaciones/${editingPublicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      setSaveError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setSaveError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    closeEditor()
    router.refresh()
  }

  async function handleCreatePublication(values: PublicationFormValues, close: () => void) {
    setCreateError(null)

    let response: Response

    try {
      response = await fetch('/api/publicaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
    } catch {
      setCreateError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setCreateError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    close()
    router.refresh()
  }

  async function handleDeletePublication(id: string) {
    setSaveError(null)

    let response: Response

    try {
      response = await fetch(`/api/publicaciones/${id}`, {
        method: 'DELETE',
      })
    } catch {
      setSaveError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setSaveError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    router.refresh()
  }

  const filtered = useMemo(() => {
    return publications.filter((publication) => {
      const matchesGroup = selectedGroup === null || publication.researchGroup === selectedGroup

      const matchesSearch =
        query.trim() === '' ||
        matches(publication.title, query) ||
        publication.authors.some((author) => matches(author, query)) ||
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
            onChange={(value) => setSelectedGroup(value === '' ? null : (value as ResearchGroup))}
            options={[
              { value: '', label: 'Todas las publicaciones' },
              { value: 'LASCE', label: 'LASCE' },
              { value: 'ROSAC', label: 'ROSAC' },
            ]}
            value={selectedGroup ?? ''}
          />
        </div>

        <div aria-label="Cantidad de publicaciones" aria-live="polite" className="publications-kpi">
          <strong>{filtered.length}</strong>
          <span>
            {selectedGroup ? `publicaciones (${selectedGroup})` : 'publicaciones en total'}
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
          {editMode && canCreate ? (
            <AddItemCard label="Añadir">
              {({ close }) => (
                <>
                  {createError ? <p className="form-alert">{createError}</p> : null}

                  <PublicationForm
                    publication={blankPublication}
                    confirmMessage="¿Desea agregar esta publicación?"
                    confirmTitle="Agregar publicación"
                    onCancel={() => {
                      setCreateError(null)
                      close()
                    }}
                    onSave={(values) => handleCreatePublication(values, close)}
                  />
                </>
              )}
            </AddItemCard>
          ) : null}

          {filtered.map((publication) => {
            const showEditor = editMode && (canEdit || canDelete)
            if (!showEditor) {
              return (
                <PublicationCard
                  abstract={publication.abstract}
                  authors={publication.authors.join(', ')}
                  href={publication.href}
                  key={publication.slug}
                  researchGroup={publication.researchGroup}
                  title={publication.title}
                  venue={publication.venue}
                  year={publication.year}
                />
              )
            }

            return (
              <EditableWrapper
                key={publication.slug}
                deleteConfirmMessage={`¿Desea eliminar "${publication.title}"? Esta acción no se puede deshacer.`}
                deleteConfirmTitle="Eliminar publicacion"
                deleteLabel={`Eliminar ${publication.title}`}
                editLabel={`Editar ${publication.title}`}
                onDelete={canDelete ? () => handleDeletePublication(publication.slug) : undefined}
                onEdit={canEdit ? () => openEditor(publication.slug) : undefined}
              >
                <PublicationCard
                  abstract={publication.abstract}
                  authors={publication.authors.join(', ')}
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

      <Modal
        onClose={closeEditor}
        open={editingPublication !== undefined}
        title={editingPublication ? `Editar "${editingPublication.title}"` : 'Editar publicación'}
      >
        {editingPublication ? (
          <>
            {saveError ? <p className="form-alert">{saveError}</p> : null}

            <PublicationForm
              publication={{
                abstract: editingPublication.abstract,
                authors: editingPublication.authors,
                DOI: editingPublication.href ?? '',
                researchGroup: editingPublication.researchGroup,
                title: editingPublication.title,
                venue: editingPublication.venue,
                date: editingPublication.date,
              }}
              onCancel={closeEditor}
              onSave={handleSavePublication}
            />
          </>
        ) : null}
      </Modal>
    </section>
  )
}
