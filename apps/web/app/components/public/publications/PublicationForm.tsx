'use client'

import { useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import type { ResearchGroup } from '@/app/lib/publications'

const researchGroupOptions: FormFieldOption[] = [
  { value: 'LASCE', label: 'LASCE' },
  { value: 'ROSAC', label: 'ROSAC' },
]

export interface PublicationFormValues {
  abstract: string
  authors: string[]
  DOI: string
  researchGroup: ResearchGroup
  title: string
  venue: string
  date: Date
}

export interface PublicationFormProps {
  /** The publication's current values — the form starts pre-filled with these. */
  publication: PublicationFormValues
  onSave: (values: PublicationFormValues) => void
  onCancel: () => void
  /** Overrides the confirmation dialog's copy — a new card reads oddly as "save the changes". */
  confirmTitle?: string
  confirmMessage?: string
}

/**
 * Creates or edits one publication card (abstract, authors, DOI, researchGroup,
 * title, venue, date) —
 * `publication` starts blank for a new card, or pre-filled for an existing one.
 * Saving asks for confirmation first, same as `EditableWrapper`'s delete
 * action, since there is no undo yet.
 */
export function PublicationForm({
  publication,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en esta publicacion?',
}: PublicationFormProps) {
  const [title, setTitle] = useState(publication.title)
  const [doi, setDoi] = useState(publication.DOI)
  const [abstract, setAbstract] = useState(publication.abstract)
  const [authors, setAuthors] = useState<string[]>(publication.authors)
  const [researchGroup, setResearchGroup] = useState<ResearchGroup>(publication.researchGroup)
  const [venue, setVenue] = useState(publication.venue)
  const [date, setDate] = useState(publication.date.toISOString().split('T')[0]!)

  const [confirmOpen, setConfirmOpen] = useState(false)

  const canSave = title.trim() !== '' && abstract.trim() !== '' && abstract.trim() !== ''

  function updateAuthor(index: number, value: string) {
    setAuthors((current) => current.map((author, i) => (i === index ? value : author)))
  }

  function addAuthor() {
    setAuthors((current) => [...current, ''])
  }

  function removeAuthor(index: number) {
    setAuthors((current) => current.filter((_, i) => i !== index))
  }

  return (
    <div className="publication-form">
      <FormField id="publication-title" label="Título" onChange={setTitle} required value={title} />

      <FormField
        id="publication-date"
        label="Fecha"
        type="date"
        onChange={setDate}
        required
        value={date}
      />

      <div className="publication-authors">
        <label>Autores</label>

        {authors.map((author, index) => (
          <div className="publication-author-row" key={index}>
            <FormField
              id={`publication-author-${index}`}
              label={`Autor ${index + 1}`}
              onChange={(value) => updateAuthor(index, value)}
              required
              value={author}
            />

            {authors.length > 1 ? (
              <Button onClick={() => removeAuthor(index)} variant="secondary">
                Eliminar
              </Button>
            ) : null}
          </div>
        ))}

        <div className="publication-add-author">
          <Button onClick={addAuthor} variant="secondary">
            Añadir autor
          </Button>
        </div>
      </div>

      <FormField id="publication-doi" label="DOI" onChange={setDoi} value={doi} />

      <FormField
        id="publication-venue"
        label="Revista/Fuente"
        onChange={setVenue}
        required
        value={venue}
      />

      <FormField
        id="publication-abstract"
        label="Resumen"
        multiline
        onChange={setAbstract}
        required
        value={abstract}
      />

      <FormField
        id="publication-research-group"
        label="Grupo"
        onChange={(value) => setResearchGroup(value as ResearchGroup)}
        options={researchGroupOptions}
        value={researchGroup}
      />

      <div className="publication-form-actions">
        <Button onClick={onCancel} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={!canSave} onClick={() => setConfirmOpen(true)} variant="primary">
          Confirmar
        </Button>
      </div>

      <ConfirmDialog
        message={confirmMessage}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          onSave({
            title,
            abstract,
            authors,
            DOI: doi,
            researchGroup,
            venue,
            date: new Date(date),
          })
        }}
        open={confirmOpen}
        title={confirmTitle}
      />
    </div>
  )
}
