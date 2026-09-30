'use client'

import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { Plus, X } from 'lucide-react'
import { IconButton } from '@/app/components/public/IconButton'
import { Modal } from '@/app/components/public/Modal'
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
  confirmTitle?: string
  confirmMessage?: string
}

export function PublicationForm({
  publication,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en esta publicación?',
}: PublicationFormProps) {
  const formId = useId()

  const [title, setTitle] = useState(publication.title)
  const [authors, setAuthors] = useState<string[]>(publication.authors)
  const [venue, setVenue] = useState(publication.venue)
  const [date, setDate] = useState(publication.date.toISOString().slice(0, 10))
  const [abstract, setAbstract] = useState(publication.abstract)
  const [href, setHref] = useState(publication.href || '')
  const [DOI, setDOI] = useState(publication.DOI || '')
  const [researchGroup, setResearchGroup] = useState<ResearchGroup>(publication.researchGroup)

  const [isAddingAuthor, setIsAddingAuthor] = useState(false)
  const [newAuthor, setNewAuthor] = useState('')
  const [newAuthorError, setNewAuthorError] = useState<string | null>(null)
  const [showAuthorValidation, setShowAuthorValidation] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)

  function validateTitle(value: string) {
    if (value.trim() === '') {
      throw new Error('Es necesario un título.')
    }
  }

  const validateDate = (value: string) => {
    if (value === '') {
      throw new Error('Debe establecer la fecha de publicación.')
    }
  }

  const validateVenue = (value: string) => {
    if (value.trim() === '') {
      throw new Error('Debe tener revista o medio de publicación.')
    }
  }

  const validateAbstract = (value: string) => {
    if (value.trim() === '') {
      throw new Error('Debe tener un resumen.')
    }
  }

  const validateResearchGroup = (value: string) => {
    if (value.trim() === '') {
      throw new Error('Debe tener un grupo de investigación.')
    }
  }

  const canSave =
    title.trim() !== '' &&
    authors.length > 0 &&
    venue.trim() !== '' &&
    date !== '' &&
    abstract.trim() !== '' &&
    researchGroup.trim() !== ''

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

  function validateFields() {
    setTitle(title.trim())
    setVenue(venue.trim())
    setDate(date.trim())
    setHref(href?.trim() ?? '')
    setDOI(DOI?.trim() ?? '')
    setNewAuthor(newAuthor.trim())
    setAbstract(abstract.trim())
    setShowAuthorValidation(true)

    if (canSave) {
      setConfirmOpen(true)
    }
  }

  function handleSubmit() {
    setConfirmOpen(false)

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
        id={`${formId}-title`}
        label="Título"
        onChange={setTitle}
        required
        validate={validateTitle}
        value={title}
      />

      <FormField
        id="publication-date"
        label="Fecha de publicación"
        onChange={setDate}
        required
        type="date"
        validate={validateDate}
        value={date}
      />

      <div className="cms-form-field">
        <span className="cms-form-field-label" id="publication-authors-label">
          Autores
        </span>

        <div
          aria-labelledby="publication-authors-label"
          className={`email-chip-field${showAuthorValidation && authors.length === 0 ? ' form-field-error' : ''}`}
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

        {showAuthorValidation && authors.length === 0 && (
          <p className="form-field-error">Se requiere al menos un autor para la publicación.</p>
        )}
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

      <FormField id={`publication-href`} label="Enlace externo" onChange={setHref} value={href} />

      <FormField id={`publication-doi`} label="DOI" onChange={setDOI} value={DOI} />

      <FormField
        id={`publication-venue-venue`}
        label="Revista/Publicación"
        onChange={setVenue}
        required
        validate={validateVenue}
        value={venue}
      />

      <FormField
        id="publication-abstract"
        label="Resumen"
        multiline
        onChange={setAbstract}
        required
        validate={validateAbstract}
        value={abstract}
      />

      <FormField
        id="publication-research-group"
        label="Grupo"
        onChange={(value) => setResearchGroup(value as ResearchGroup)}
        options={researchGroupOptions}
        validate={validateResearchGroup}
        value={researchGroup}
      />

      <div className="nosotros-activity-form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button onClick={validateFields} variant="primary">
          Confirmar
        </Button>
      </div>

      <ConfirmDialog
        message={confirmMessage}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleSubmit}
        open={confirmOpen}
        title={confirmTitle}
      />
    </div>
  )
}
