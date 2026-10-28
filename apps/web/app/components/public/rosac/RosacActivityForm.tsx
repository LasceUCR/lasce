'use client'

import { useId, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import type { RosacCardIcon } from '@/app/lib/rosac'

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
  const t = useTranslations('rosac.editor')
  const initial = activity ?? blankRosacActivity
  const [icon, setIcon] = useState<RosacCardIcon>(initial.icon)
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)

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
    hasAttemptedSubmit && title.trim() === '' ? t('activities.titleRequired') : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? t('activities.descriptionRequired') : null

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
        label={t('activities.iconLabel')}
        onChange={(value) => setIcon(value as RosacCardIcon)}
        options={iconOptions}
        value={icon}
      />

      <FormField
        errorMessage={titleError}
        id={`${formId}-title`}
        label={t('activities.titleLabel')}
        onChange={setTitle}
        required
        value={title}
      />

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label={t('activities.descriptionLabel')}
        multiline
        onChange={setDescription}
        required
        value={description}
      />

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          {t('activities.cancel')}
        </Button>
        <Button onClick={handleConfirmClick} variant="primary">
          {t('activities.save')}
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
