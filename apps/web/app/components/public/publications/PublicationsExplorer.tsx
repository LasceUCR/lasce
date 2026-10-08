'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicationCard } from './PublicationCard'
import { Select } from '@/app/components/public/Select'
import { SearchBar } from '@/app/components/public/SearchBar'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { Publication, ResearchGroup } from '@/app/lib/publications'
import { Modal } from '@/app/components/public/Modal'
import { Button } from '@/app/components/public/Button'
import { PublicationForm } from './PublicationForm'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { parseApiError, sendJson } from '@/app/lib/cms/save'
import { contentLangAttribute } from '@/app/lib/i18n/content/resolve'
import {
  buildCreateRequest,
  buildUpdateRequest,
  describeSaveFailure,
  emptyInitial,
  initialFromPublication,
  SAVE_ERROR_MESSAGE,
  type PublicationDraft,
  type PublicationFormInitial,
  type SaveFailure,
} from '@/app/lib/publication-form'
import type { ReviewConfirmation } from '@/app/lib/publication-schema'

export interface PublicationsExplorerProps {
  publications: Publication[]
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

function matches(value: string, query: string) {
  return value.toLowerCase().includes(query.trim().toLowerCase())
}

/** Sends a JSON request and reads the failure, if any, the way the editor shows it. */
async function send(
  url: string,
  method: 'POST' | 'PATCH',
  body: unknown,
): Promise<SaveFailure | null> {
  const result = await sendJson(url, method, body)

  if (result.ok) return null
  if (result.status === 0) return { message: SAVE_ERROR_MESSAGE, fieldErrors: {}, reopen: false }

  return describeSaveFailure(result.status, result.body)
}

interface Editing {
  publication: Publication
  /** Taken when the editor opened, so a refresh behind it cannot change what it saves against. */
  initial: PublicationFormInitial
}

export function PublicationsExplorer({
  publications,
  canCreate = false,
  canEdit = false,
  canDelete = false,
}: PublicationsExplorerProps) {
  const router = useRouter()
  const { editMode } = useEditMode()
  const [editing, setEditing] = useState<Editing | null>(null)
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [createFailure, setCreateFailure] = useState<SaveFailure | null>(null)
  const [createInitial, setCreateInitial] = useState<PublicationFormInitial>(() => emptyInitial())

  // One save at a time: a second click while the first request is in flight would send the same
  // version again and come back as a false conflict.
  const saving = useRef(false)

  const [query, setQuery] = useState('')

  const [selectedGroup, setSelectedGroup] = useState<ResearchGroup | null>(null)

  function openEditor(publication: Publication) {
    setSaveFailure(null)
    setEditing({ publication, initial: initialFromPublication(publication) })
  }

  function closeEditor() {
    setSaveFailure(null)
    setEditing(null)
  }

  async function handleSavePublication(draft: PublicationDraft, confirmed: ReviewConfirmation[]) {
    if (!editing) return

    const body = buildUpdateRequest(editing.initial, draft, confirmed)
    if (!body) {
      closeEditor()
      return
    }

    if (saving.current) return
    saving.current = true
    const failure = await send(`/api/publicaciones/${editing.publication.slug}`, 'PATCH', body)
    saving.current = false
    if (failure) {
      setSaveFailure(failure)
      return
    }

    closeEditor()
    router.refresh()
  }

  async function handleCreatePublication(draft: PublicationDraft, close: () => void) {
    if (saving.current) return
    saving.current = true
    setCreateFailure(null)

    const failure = await send('/api/publicaciones', 'POST', buildCreateRequest(draft))
    saving.current = false
    if (failure) {
      setCreateFailure(failure)
      return
    }

    setCreateInitial(emptyInitial())
    close()
    router.refresh()
  }

  async function handleDeletePublication(id: string) {
    setDeleteError(null)

    const result = await sendJson(`/api/publicaciones/${id}`, 'DELETE')

    if (!result.ok) {
      setDeleteError(parseApiError(result.body).message ?? SAVE_ERROR_MESSAGE)
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

      {deleteError ? (
        <p className="form-alert" role="alert">
          {deleteError}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="content-empty" role="status">
          {getEmptyMessage()}
        </p>
      ) : null}

      {/* The add card stays available with nothing listed, so the first publication can be
          created and a search with no results does not hide it. */}
      {filtered.length > 0 || (editMode && canCreate) ? (
        <div className="publication-list">
          {editMode && canCreate ? (
            <AddItemCard label="Añadir">
              {({ close }) => (
                <>
                  {createFailure ? (
                    <p className="form-alert" role="alert">
                      {createFailure.message}
                    </p>
                  ) : null}

                  <PublicationForm
                    confirmMessage="¿Desea agregar esta publicación?"
                    confirmTitle="Agregar publicación"
                    initial={createInitial}
                    onCancel={() => {
                      setCreateFailure(null)
                      close()
                    }}
                    onSave={(draft) => handleCreatePublication(draft, close)}
                    serverErrors={createFailure?.fieldErrors}
                  />
                </>
              )}
            </AddItemCard>
          ) : null}

          {filtered.map((publication) => {
            const card = (
              <PublicationCard
                abstract={publication.abstract}
                authors={publication.authors.join(', ')}
                contentLang={contentLangAttribute(publication.contentLocale)}
                href={publication.href}
                key={publication.slug}
                researchGroup={publication.researchGroup}
                title={publication.title}
                translationMissing={editMode && publication.editing?.isLegacy === true}
                venue={publication.venue}
                year={publication.year}
              />
            )

            const showEditor = editMode && (canEdit || canDelete)
            if (!showEditor) return card

            return (
              <EditableWrapper
                key={publication.slug}
                deleteConfirmMessage={`¿Desea eliminar "${publication.title}"? Esta acción no se puede deshacer.`}
                deleteConfirmTitle="Eliminar publicacion"
                deleteLabel={`Eliminar ${publication.title}`}
                editLabel={`Editar ${publication.title}`}
                onDelete={canDelete ? () => handleDeletePublication(publication.slug) : undefined}
                onEdit={canEdit ? () => openEditor(publication) : undefined}
              >
                {card}
              </EditableWrapper>
            )
          })}
        </div>
      ) : null}

      <Modal
        onClose={closeEditor}
        open={editing !== null}
        title={editing ? `Editar "${editing.publication.title}"` : 'Editar publicación'}
      >
        {editing ? (
          <>
            {saveFailure ? (
              <div className="form-alert" role="alert">
                <p>{saveFailure.message}</p>
                {saveFailure.reopen ? (
                  <Button
                    onClick={() => {
                      closeEditor()
                      router.refresh()
                    }}
                    variant="secondary"
                  >
                    Cerrar y cargar la versión actual
                  </Button>
                ) : null}
              </div>
            ) : null}

            <PublicationForm
              initial={editing.initial}
              onCancel={closeEditor}
              onSave={handleSavePublication}
              serverErrors={saveFailure?.fieldErrors}
            />
          </>
        ) : null}
      </Modal>
    </section>
  )
}
