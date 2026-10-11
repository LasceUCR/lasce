'use client'

import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FormField } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'

export interface RosacStageFormValues {
  title: string
  description: string
}

export interface RosacStageFormProps {
  stage: RosacStageFormValues
  onSave: (values: RosacStageFormValues) => void
  onCancel: () => void
}

export function RosacStageForm({ stage, onSave, onCancel }: RosacStageFormProps) {
  const [title, setTitle] = useState(stage.title)
  const [description, setDescription] = useState(stage.description)

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const formId = useId()

  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'El título es obligatorio.' : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? 'La descripción es obligatoria.' : null

  const isFormValid = title.trim() !== '' && description.trim() !== ''

  const isDirty = title !== stage.title || description !== stage.description

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      onCancel()
    }
  }

  function handleConfirmClick() {
    setHasAttemptedSubmit(true)
    if (!isFormValid) {
      if (title.trim() === '') {
        document.getElementById(`${formId}-title`)?.focus()
      } else if (description.trim() === '') {
        document.getElementById(`${formId}-description`)?.focus()
      }
      return
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
    })
  }

  return (
    <div className="cms-form">
      <FormField
        errorMessage={titleError}
        id={`${formId}-title`}
        label="Título"
        onChange={setTitle}
        required
        value={title}
      />

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label="Descripción"
        multiline
        onChange={setDescription}
        required
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
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onCancel()
        }}
        open={confirmDiscardOpen}
        severity="warning"
        title="Descartar cambios no guardados"
      />
    </div>
  )
}
