'use client'

import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FormField } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import type { RosacCardIcon } from '@/app/lib/rosac'

import { ROSAC_CARD_ICON_OPTIONS } from './RosacCharacteristicForm'

export interface RosacActivityFormValues {
  icon: RosacCardIcon
  title: string
  description: string
}

export interface RosacActivityFormProps {
  /** Blank/null for creating new activity; existing values for editing. */
  activity: RosacActivityFormValues | null
  onSave: (values: RosacActivityFormValues) => void
  onCancel: () => void
}

export const blankRosacActivity: RosacActivityFormValues = {
  icon: 'tracking',
  title: '',
  description: '',
}

export function RosacActivityForm({ activity, onSave, onCancel }: RosacActivityFormProps) {
  const initial = activity ?? blankRosacActivity
  const [icon, setIcon] = useState<RosacCardIcon>(initial.icon)
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const formId = useId()

  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'El título es obligatorio.' : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? 'La descripción es obligatoria.' : null

  const isFormValid = title.trim() !== '' && description.trim() !== ''

  const isDirty =
    icon !== initial.icon || title !== initial.title || description !== initial.description

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
      icon,
      title: title.trim(),
      description: description.trim(),
    })
  }

  return (
    <div className="cms-form">
      <FormField
        id={`${formId}-icon`}
        label="Ícono"
        onChange={(value) => setIcon(value as RosacCardIcon)}
        options={ROSAC_CARD_ICON_OPTIONS}
        value={icon}
      />

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
