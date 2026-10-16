'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
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

const iconValues: readonly NosotrosCardIcon[] = [
  'sun',
  'waves',
  'satellite',
  'code',
  'collaboration',
  'education',
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
  /**
   * Whether "Confirmar" opens a confirmation dialog before calling `onSave`. Editing keeps it,
   * since there is no undo yet; creating a card turns it off and saves straight away.
   */
  requireConfirmation?: boolean
  /** Overrides the confirmation dialog's copy. */
  confirmTitle?: string
  confirmMessage?: string
}

/**
 * Creates or edits one Nosotros activity flashcard (icon, title, text) —
 * `activity` starts blank for a new card, or pre-filled for an existing one.
 * Saving asks for confirmation first unless `requireConfirmation` is false,
 * same as `EditableWrapper`'s delete action, since there is no undo yet.
 */
export function NosotrosActivityForm({
  activity,
  onSave,
  onCancel,
  requireConfirmation = true,
  confirmTitle,
  confirmMessage,
}: NosotrosActivityFormProps) {
  const t = useTranslations('nosotros.activities.form')
  const iconOptions: FormFieldOption[] = iconValues.map((value) => ({
    value,
    label: t(`icons.${value}`),
  }))
  const [icon, setIcon] = useState<NosotrosCardIcon>(activity.icon)
  const [title, setTitle] = useState(activity.title)
  const [description, setDescription] = useState(activity.description)
  const [confirmOpen, setConfirmOpen] = useState(false)
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

  const titleError = hasAttemptedSubmit && title.trim() === '' ? t('titleRequired') : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? t('textRequired') : null

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

    if (requireConfirmation) {
      setConfirmOpen(true)
    } else {
      onSave({ icon, title, description })
    }
  }

  return (
    <div className="cms-form">
      <FormField
        id={`${formId}-icon`}
        label={t('icon')}
        onChange={(value) => setIcon(value as NosotrosCardIcon)}
        options={iconOptions}
        value={icon}
      />

      <FormField
        errorMessage={titleError}
        id={`${formId}-title`}
        label={t('title')}
        onChange={setTitle}
        required
        validate={requireNonEmpty(t('titleRequired'))}
        value={title}
      />

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label={t('text')}
        multiline
        onChange={setDescription}
        required
        validate={requireNonEmpty(t('textRequired'))}
        value={description}
      />

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          {t('cancel')}
        </Button>
        <Button onClick={handleConfirmClick} variant="primary">
          {t('confirm')}
        </Button>
      </div>

      {requireConfirmation ? (
        <ConfirmDialog
          message={confirmMessage ?? t('confirmMessage')}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            onSave({ icon, title, description })
          }}
          open={confirmOpen}
          title={confirmTitle ?? t('confirmTitle')}
        />
      ) : null}

      <StandardConfirmDialog
        cancelLabel={t('discard.cancel')}
        confirmLabel={t('discard.confirm')}
        message={t('discard.message')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discard.title')}
      />
    </div>
  )
}
