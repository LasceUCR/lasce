'use client'

import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
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
  DOI: string
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
  const [DOI, setDOI] = useState(publication.DOI)
  const [researchGroup, setResearchGroup] = useState<ResearchGroup>(publication.researchGroup)

  const [authorToRemove, setAuthorToRemove] = useState('')
  const [newAuthor, setNewAuthor] = useState(' ')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const authorOptions: FormFieldOption[] = [
    { value: '', label: 'Seleccionar autor para eliminar...' },
    ...authors.map((author) => ({
      value: author,
      label: author,
    })),
  ]

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

  const validateDOI = (value: string) => {
    if (value.trim() === '') {
      throw new Error('Debe tener un DOI o vinculo externo.')
    }
  }

  const validateResearchGroup = (value: string) => {
    if (value.trim() === '') {
      throw new Error('Debe tener un grupo de investigación.')
    }
  }

  const validateAuthors = () => {
    if (authors.length === 0) {
      throw new Error('Debe haber al menos un autor agregado.')
    }
  }

  const canSave =
    title.trim() !== '' &&
    authors.length > 0 &&
    venue.trim() !== '' &&
    date !== '' &&
    abstract.trim() !== ''

  function handleRemoveAuthor() {
    if (!authorToRemove) return

    setAuthors((current) => current.filter((author) => author !== authorToRemove))
    setAuthorToRemove('')
  }

  function handleAddAuthor() {
    const author = newAuthor.trim()

    if (!author) return

    if (!authors.some((existing) => existing.toLowerCase() === author.toLowerCase())) {
      setAuthors((current) => [...current, author])
    }

    setNewAuthor('')
  }

  function validateFields() {
    setTitle(title.trim())
    setVenue(venue.trim())
    setDate(date.trim())
    setDOI(DOI.trim())
    setNewAuthor(newAuthor.trim())
    setAbstract(abstract.trim())
    setResearchGroup(researchGroup)

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

      <FormField
        id={`${formId}-authors-remove`}
        label="Eliminar autor"
        onChange={setAuthorToRemove}
        options={authorOptions}
        placeholder="Buscar autor..."
        value={authorToRemove}
      />

      <Button disabled={!authorToRemove} onClick={handleRemoveAuthor} variant="danger">
        Eliminar autor
      </Button>

      <div className="publication-form-author-add">
        <FormField
          id={`${formId}-author-add`}
          label="Añadir autor"
          onChange={setNewAuthor}
          value={newAuthor}
          validate={validateAuthors}
          required={authors.length === 0}
        />

        <Button disabled={newAuthor.trim() === ''} onClick={handleAddAuthor} variant="secondary">
          Añadir autor
        </Button>
      </div>

      <FormField
        id={`publication-doi`}
        label="DOI"
        onChange={setDOI}
        validate={validateDOI}
        value={DOI}
        required
      />

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
