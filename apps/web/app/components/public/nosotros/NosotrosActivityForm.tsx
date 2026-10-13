'use client'

import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import type { NosotrosCardIcon } from '@/app/lib/nosotros'

/** Messages match `nosotrosActivityInputSchema` so a rejection reads the same
 * whether it's caught here or by the server after submission. */
function requireNonEmpty(message: string) {
  return (value: string) => {
    if (value.trim() === '') throw new Error(message)
  }
}

const iconOptions: FormFieldOption[] = [
  { value: 'sun', label: 'Sol' },
  { value: 'waves', label: 'Ondas' },
  { value: 'satellite', label: 'Satélite' },
  { value: 'code', label: 'Código' },
  { value: 'collaboration', label: 'Colaboración' },
  { value: 'education', label: 'Educación' },
]

export interface NosotrosActivityFormValues {
  icon: NosotrosCardIcon
  title: string
  description: string
}

export interface NosotrosActivityFormProps {
  /** The activity's current values — the form starts pre-filled with these. */
  activity: NosotrosActivityFormValues
  onSave: (values: NosotrosActivityFormValues) => void
  onCancel: () => void
}

/**
 * Creates or edits one Nosotros activity flashcard (icon, title, text) —
 * `activity` starts blank for a new card, or pre-filled for an existing one.
 * Saving goes straight to `onSave`; only deleting asks for confirmation.
 */
export function NosotrosActivityForm({ activity, onSave, onCancel }: NosotrosActivityFormProps) {
  const [icon, setIcon] = useState<NosotrosCardIcon>(activity.icon)
  const [title, setTitle] = useState(activity.title)
  const [description, setDescription] = useState(activity.description)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const formId = useId()

  const isDirty =
    icon !== activity.icon || title !== activity.title || description !== activity.description

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    onCancel()
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false)
    onCancel()
  }

  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'El título es obligatorio.' : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? 'El texto es obligatorio.' : null

  function handleConfirmClick() {
    setHasAttemptedSubmit(true)
    if (title.trim() === '' || description.trim() === '') {
      if (title.trim() === '') {
        document.getElementById(`${formId}-title`)?.focus()
      } else {
        document.getElementById(`${formId}-description`)?.focus()
      }
      return
    }

    onSave({ icon, title, description })
  }

  return (
    <div className="cms-form">
      <FormField
        id={`${formId}-icon`}
        label="Ícono"
        onChange={(value) => setIcon(value as NosotrosCardIcon)}
        options={iconOptions}
        value={icon}
      />

      <FormField
        errorMessage={titleError}
        id={`${formId}-title`}
        label="Título"
        onChange={setTitle}
        required
        validate={requireNonEmpty('El título es obligatorio.')}
        value={title}
      />

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label="Texto"
        multiline
        onChange={setDescription}
        required
        validate={requireNonEmpty('El texto es obligatorio.')}
        value={description}
      />

      <div className="cms-form-actions">
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
        severity="warning"
        title="Descartar cambios no guardados"
      />
    </div>
  )
}
