'use client'

import { useId, useState } from 'react'
import { Plus, X } from 'lucide-react'

import { Button } from '@/app/components/public/Button'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { IconButton } from '@/app/components/public/IconButton'
import { Modal } from '@/app/components/public/Modal'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import type { ResearchGroup } from '@/app/lib/publications'

const researchGroupOptions: FormFieldOption[] = [
  { value: 'LASCE', label: 'LASCE' },
  { value: 'ROSAC', label: 'ROSAC' },
]

export interface PublicationFormValues {
  title: string
  authors: string[]
  venue: string
  date: Date
  abstract: string
  href?: string
  DOI?: string
  researchGroup: ResearchGroup
}

export interface PublicationFormProps {
  publication: PublicationFormValues
  onSave: (values: PublicationFormValues) => void
  onCancel: () => void
}

export function PublicationForm({ publication, onSave, onCancel }: PublicationFormProps) {
  const formId = useId()
  const initialDate = publication.date.toISOString().slice(0, 10)

  const [title, setTitle] = useState(publication.title)
  const [authors, setAuthors] = useState<string[]>(publication.authors)
  const [venue, setVenue] = useState(publication.venue)
  const [date, setDate] = useState(initialDate)
  const [abstract, setAbstract] = useState(publication.abstract)
  const [href, setHref] = useState(publication.href ?? '')
  const [DOI, setDOI] = useState(publication.DOI ?? '')
  const [researchGroup, setResearchGroup] = useState<ResearchGroup>(publication.researchGroup)

  const [isAddingAuthor, setIsAddingAuthor] = useState(false)
  const [newAuthor, setNewAuthor] = useState('')
  const [newAuthorError, setNewAuthorError] = useState<string | null>(null)

  // Standards: validation only runs once "Confirmar" is pressed, same as
  // NewsArticleForm — a message appearing before anyone has finished filling
  // the form in reads as premature nagging.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'Es necesario un título.' : null
  const dateError =
    hasAttemptedSubmit && date === '' ? 'Debe establecer la fecha de publicación.' : null
  const authorsError =
    hasAttemptedSubmit && authors.length === 0
      ? 'Se requiere al menos un autor para la publicación.'
      : null
  const venueError =
    hasAttemptedSubmit && venue.trim() === '' ? 'Debe tener revista o medio de publicación.' : null
  const abstractError =
    hasAttemptedSubmit && abstract.trim() === '' ? 'Debe tener un resumen.' : null
  const researchGroupError =
    hasAttemptedSubmit && researchGroup.trim() === ''
      ? 'Debe tener un grupo de investigación.'
      : null

  // Same reasoning as NewsArticleForm: discarding a form nobody has changed
  // yet reads as an odd extra click, so the warning only shows up once
  // something was actually typed (or a submit was attempted and failed).
  const isDirty =
    hasAttemptedSubmit ||
    title !== publication.title ||
    JSON.stringify(authors) !== JSON.stringify(publication.authors) ||
    venue !== publication.venue ||
    date !== initialDate ||
    abstract !== publication.abstract ||
    href !== (publication.href ?? '') ||
    DOI !== (publication.DOI ?? '') ||
    researchGroup !== publication.researchGroup

  function openAddAuthor() {
    setNewAuthor('')
    setNewAuthorError(null)
    setIsAddingAuthor(true)
  }

  function closeAddAuthor() {
    setIsAddingAuthor(false)
  }

  function handleAddAuthor() {
    const trimmed = newAuthor.trim()

    if (!trimmed) {
      setNewAuthorError('El nombre del autor es obligatorio.')
      return
    }

    if (authors.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      setNewAuthorError('Ese autor ya fue agregado.')
      return
    }

    setAuthors([...authors, trimmed])
    closeAddAuthor()
  }

  function handleRemoveAuthor(author: string) {
    setAuthors(authors.filter((existing) => existing !== author))
  }

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      onCancel()
    }
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false)
    onCancel()
  }

  function handleConfirmClick() {
    setHasAttemptedSubmit(true)

    if (title.trim() === '') {
      document.getElementById(`${formId}-title`)?.focus()
      return
    }
    if (authors.length === 0) {
      return
    }
    if (venue.trim() === '') {
      document.getElementById('publication-venue')?.focus()
      return
    }
    if (date === '') {
      document.getElementById('publication-date')?.focus()
      return
    }
    if (abstract.trim() === '') {
      document.getElementById('publication-abstract')?.focus()
      return
    }
    if (researchGroup.trim() === '') {
      document.getElementById('publication-research-group')?.focus()
      return
    }

    onSave({
      title,
      authors,
      venue,
      date: new Date(`${date}T00:00:00`),
      abstract,
      href,
      DOI,
      researchGroup,
    })
  }

  return (
    <div className="publication-form">
      <FormField
        errorMessage={titleError}
        id={`${formId}-title`}
        label="Título"
        onChange={setTitle}
        required
        value={title}
      />

      <FormField
        errorMessage={dateError}
        id="publication-date"
        label="Fecha de publicación"
        onChange={setDate}
        required
        type="date"
        value={date}
      />

      <div className="cms-form-field">
        <span className="cms-form-field-label" id="publication-authors-label">
          Autores
        </span>

        <div
          aria-labelledby="publication-authors-label"
          className={`email-chip-field${authorsError ? ' form-field-error' : ''}`}
          role="group"
        >
          {authors.map((author) => (
            <span className="email-chip" key={author}>
              {author}

              <IconButton
                className="email-chip-remove"
                icon={<X size={12} strokeWidth={2} />}
                label={`Eliminar ${author}`}
                onClick={() => handleRemoveAuthor(author)}
              />
            </span>
          ))}

          <IconButton
            className="email-chip-add"
            icon={<Plus size={14} strokeWidth={2} />}
            label="Añadir autor"
            onClick={openAddAuthor}
          />
        </div>

        {authorsError ? <p className="form-field-error">{authorsError}</p> : null}
      </div>

      <Modal onClose={closeAddAuthor} open={isAddingAuthor} size="small" title="Añadir autor">
        <FormField
          id={`${formId}-new-author`}
          label="Nombre del autor"
          onChange={(value) => {
            setNewAuthor(value)
            setNewAuthorError(null)
          }}
          value={newAuthor}
        />

        {newAuthorError ? (
          <p className="form-alert" role="alert">
            {newAuthorError}
          </p>
        ) : null}

        <div className="cms-form-actions">
          <Button onClick={closeAddAuthor} variant="secondary">
            Cancelar
          </Button>

          <Button disabled={newAuthor.trim() === ''} onClick={handleAddAuthor} variant="primary">
            Añadir
          </Button>
        </div>
      </Modal>

      <FormField id="publication-href" label="Enlace externo" onChange={setHref} value={href} />

      <FormField id="publication-doi" label="DOI" onChange={setDOI} value={DOI} />

      <FormField
        errorMessage={venueError}
        id="publication-venue"
        label="Revista/Publicación"
        onChange={setVenue}
        required
        value={venue}
      />

      <FormField
        errorMessage={abstractError}
        id="publication-abstract"
        label="Resumen"
        multiline
        onChange={setAbstract}
        required
        value={abstract}
      />

      <FormField
        errorMessage={researchGroupError}
        id="publication-research-group"
        label="Grupo"
        onChange={(value) => setResearchGroup(value as ResearchGroup)}
        options={researchGroupOptions}
        value={researchGroup}
      />

      <div className="nosotros-activity-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          Cancelar
        </Button>
        <Button onClick={handleConfirmClick} variant="primary">
          Confirmar
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        message="Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados."
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="info"
        title="Descartar cambios no guardados"
      />
    </div>
  )
}
