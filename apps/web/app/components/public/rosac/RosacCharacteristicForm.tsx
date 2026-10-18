'use client'

import { useId, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('rosac.editor')
  const [icon, setIcon] = useState<RosacCardIcon>(characteristic.icon)
  const [title, setTitle] = useState(characteristic.title)
  const [description, setDescription] = useState(characteristic.description)

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const formId = useId()

  const iconOptions: FormFieldOption[] = useMemo(
    () => [
      { value: 'antenna', label: t('characteristics.icons.antenna') },
      { value: 'location', label: t('characteristics.icons.location') },
      { value: 'frequency', label: t('characteristics.icons.frequency') },
      { value: 'sun', label: t('characteristics.icons.sun') },
      { value: 'tracking', label: t('characteristics.icons.tracking') },
      { value: 'control', label: t('characteristics.icons.control') },
      { value: 'receiver', label: t('characteristics.icons.receiver') },
      { value: 'maintenance', label: t('characteristics.icons.maintenance') },
      { value: 'education', label: t('characteristics.icons.education') },
    ],
    [t],
  )

  const titleError =
    hasAttemptedSubmit && title.trim() === '' ? t('characteristics.titleRequired') : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === ''
      ? t('characteristics.descriptionRequired')
      : null

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
        label={t('characteristics.iconLabel')}
        onChange={(value) => setIcon(value as RosacCardIcon)}
        options={iconOptions}
        value={icon}
      />

      <FormField
        errorMessage={titleError}
        id={`${formId}-title`}
        label={t('characteristics.titleLabel')}
        onChange={setTitle}
        required
        value={title}
      />

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label={t('characteristics.descriptionLabel')}
        multiline
        onChange={setDescription}
        required
        value={description}
      />

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          {t('characteristics.cancel')}
        </Button>
        <Button onClick={handleConfirmClick} variant="primary">
          {t('characteristics.save')}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('discardDialog.message')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onCancel()
        }}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discardDialog.title')}
      />
    </div>
  )
}
