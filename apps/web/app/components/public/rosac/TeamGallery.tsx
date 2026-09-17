'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Modal } from '@/app/components/public/Modal'
import { AddItemCard } from '@/app/components/public/cms/AddItemCard'
import { EditableWrapper } from '@/app/components/public/cms/EditableWrapper'
import { useEditMode } from '@/app/components/public/cms/EditModeProvider'
import type { TeamMember } from '@/app/lib/rosac'

import { ResearcherCard } from './ResearcherCard'
import { ResearcherForm, type ResearcherFormValues } from './ResearcherForm'

export interface TeamGalleryProps {
  label: string
  emptyMessage: string
  people: readonly TeamMember[]
}

const SAVE_ERROR_MESSAGE = 'No se pudo guardar el cambio. Inténtelo de nuevo.'

/** Starting point for a brand-new profile — no photo yet, so the form requires one. */
const blankResearcher: TeamMember = {
  id: '',
  src: '',
  name: '',
  role: '',
  institution: '',
  description: '',
}

/**
 * Resolves the photo the form should save: a freshly dropped file becomes a
 * local `blob:` URL (there is no upload endpoint yet — see `ResearcherForm`'s
 * own doc comment), otherwise the existing photo carries over untouched. The
 * form disables saving unless a photo is present, so `photoRemoved` without a
 * replacement never reaches here in practice.
 */
function resolvePhotoSrc(existingSrc: string, values: ResearcherFormValues): string {
  if (values.photoFile) {
    return URL.createObjectURL(values.photoFile)
  }
  return values.photoRemoved ? '' : existingSrc
}

/**
 * A scroll-snap track rather than an index driven carousel: every portrait stays in the DOM,
 * keyboard and touch scrolling work natively, and there is no slide state, live region or focus
 * management to get wrong. `/radioastronomia` is in the zero tolerance axe sweep and index
 * carousels are the usual source of violations there.
 *
 * Each person is a `ResearcherCard`. The portrait is decorative (`alt=""`) because the name, role,
 * institution and description are rendered as real HTML beside it.
 */
export function TeamGallery({ label, emptyMessage, people }: TeamGalleryProps) {
  const router = useRouter()
  const trackRef = useRef<HTMLUListElement>(null)
  const { editMode } = useEditMode()
  const [editingResearcherId, setEditingResearcherId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const editingResearcher = people.find((person) => person.id === editingResearcherId)

  function scrollByCards(direction: 1 | -1) {
    const track = trackRef.current

    if (!track) {
      return
    }

    // Scroll by roughly one card so the snap points do the final alignment.
    track.scrollBy({ behavior: 'smooth', left: direction * (track.clientWidth * 0.6) })
  }

  function openEditor(id: string) {
    setSaveError(null)
    setEditingResearcherId(id)
  }

  function closeEditor() {
    setSaveError(null)
    setEditingResearcherId(null)
  }

  async function handleSaveResearcher(values: ResearcherFormValues) {
    if (!editingResearcher) return

    const src = resolvePhotoSrc(editingResearcher.src, values)

    let response: Response
    try {
      response = await fetch(`/api/researchers/${editingResearcher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src,
          role: values.role,
          name: values.name,
          institution: values.institution,
          description: values.description,
        }),
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
    // Re-runs the server component's `getResearchers()` so the page reflects
    // the saved change immediately, without an optimistic guess.
    router.refresh()
  }

  async function handleDeleteResearcher(id: string) {
    setListError(null)

    let response: Response
    try {
      response = await fetch(`/api/researchers/${id}`, { method: 'DELETE' })
    } catch {
      setListError(SAVE_ERROR_MESSAGE)
      return
    }

    if (!response.ok) {
      const body: { error?: string } | null = await response.json().catch(() => null)
      setListError(body?.error ?? SAVE_ERROR_MESSAGE)
      return
    }

    router.refresh()
  }

  async function handleCreateResearcher(values: ResearcherFormValues, close: () => void) {
    setCreateError(null)

    const src = resolvePhotoSrc('', values)

    let response: Response
    try {
      response = await fetch('/api/researchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src,
          role: values.role,
          name: values.name,
          institution: values.institution,
          description: values.description,
        }),
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

  if (people.length === 0 && !editMode) {
    return (
      <p className="content-empty" role="status">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="team-gallery">
      {listError ? <p className="form-alert">{listError}</p> : null}

      {people.length === 0 ? (
        <p className="topic-intro">Haga clic en &quot;Añadir&quot; para agregar un investigador.</p>
      ) : null}

      {/* Focusable so the scrollable region is reachable by keyboard, which axe requires. */}
      <ul aria-label={label} className="team-gallery-track" ref={trackRef} tabIndex={0}>
        {people.map((person) => {
          const card = (
            <ResearcherCard
              description={person.description}
              email={person.email}
              name={person.name}
              role={person.role}
              institution={person.institution}
              src={person.src}
            />
          )

          return (
            <li className="team-gallery-slide" key={person.id}>
              {editMode ? (
                <EditableWrapper
                  deleteConfirmMessage={`¿Desea eliminar a "${person.name}"? Esta acción no se puede deshacer.`}
                  deleteConfirmTitle="Eliminar investigador"
                  onDelete={() => handleDeleteResearcher(person.id)}
                  onEdit={() => openEditor(person.id)}
                >
                  {card}
                </EditableWrapper>
              ) : (
                card
              )}
            </li>
          )
        })}

        {editMode ? (
          <li className="team-gallery-slide">
            <AddItemCard label="Añadir">
              {({ close }) => (
                <>
                  {createError ? <p className="form-alert">{createError}</p> : null}
                  <ResearcherForm
                    confirmMessage="¿Desea agregar este investigador?"
                    confirmTitle="Agregar investigador"
                    onCancel={close}
                    onSave={(values) => handleCreateResearcher(values, close)}
                    researcher={blankResearcher}
                  />
                </>
              )}
            </AddItemCard>
          </li>
        ) : null}
      </ul>

      <div className="team-gallery-controls">
        <button
          aria-label="Anterior"
          className="team-gallery-control"
          onClick={() => scrollByCards(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <button
          aria-label="Siguiente"
          className="team-gallery-control"
          onClick={() => scrollByCards(1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
      </div>

      <Modal
        onClose={closeEditor}
        open={editingResearcher !== undefined}
        title={editingResearcher ? `Editar "${editingResearcher.name}"` : 'Editar investigador'}
      >
        {editingResearcher ? (
          <>
            {saveError ? <p className="form-alert">{saveError}</p> : null}
            <ResearcherForm
              onCancel={closeEditor}
              onSave={handleSaveResearcher}
              researcher={editingResearcher}
            />
          </>
        ) : null}
      </Modal>
    </div>
  )
}
