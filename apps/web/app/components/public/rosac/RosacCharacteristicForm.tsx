'use client'

import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import type { RosacCardIcon } from '@/app/lib/rosac'

export const ROSAC_CARD_ICON_OPTIONS: FormFieldOption[] = [
  { value: 'antenna', label: 'Antena' },
  { value: 'location', label: 'Ubicación' },
  { value: 'frequency', label: 'Frecuencia' },
  { value: 'sun', label: 'Sol' },
  { value: 'tracking', label: 'Apuntado y seguimiento' },
  { value: 'control', label: 'Control' },
  { value: 'receiver', label: 'Receptor' },
  { value: 'maintenance', label: 'Mantenimiento e infraestructura' },
  { value: 'education', label: 'Educación' },
]

export interface RosacCharacteristicFormValues {
  icon: RosacCardIcon
  title: string
  description: string
}

export interface RosacCharacteristicFormProps {
  characteristic: RosacCharacteristicFormValues
  onSave: (values: RosacCharacteristicFormValues) => void
  onCancel: () => void
}

export function RosacCharacteristicForm({
  characteristic,
  onSave,
  onCancel,
}: RosacCharacteristicFormProps) {
  const [icon, setIcon] = useState<RosacCardIcon>(characteristic.icon)
  const [title, setTitle] = useState(characteristic.title)
  const [description, setDescription] = useState(characteristic.description)

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const formId = useId()

  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'El título es obligatorio.' : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? 'La descripción es obligatoria.' : null

  const isFormValid = title.trim() !== '' && description.trim() !== ''

  const isDirty =
    icon !== characteristic.icon ||
    title !== characteristic.title ||
    description !== characteristic.description

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
