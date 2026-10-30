'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { uploadAcademicActivityImage } from '@/app/(public)/actividades-academicas/actions'
import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import type { AcademicActivity } from '@/app/lib/academic-activities'

/** The editable fields of an academic activity, as `/api/academic-activities` expects them. */
export interface AcademicActivityFormValues {
  title: string
  category: string
  startDate: string
  endDate: string | null
  location: string
  description: string
  photoUrl: string
  photoAlt: string
}

export interface AcademicActivityFormProps {
  /** `null` starts a blank form for a new activity. */
  activity: AcademicActivity | null
  onSave: (values: AcademicActivityFormValues) => void
  onCancel: () => void
  /** True while a save is in flight: the fields and buttons are disabled. */
  busy?: boolean
}

export function AcademicActivityForm({
  activity,
  onSave,
  onCancel,
  busy = false,
}: AcademicActivityFormProps) {
  const formId = useId()
  const t = useTranslations('academicActivities.editor')
  const validation = useTranslations('academicActivities.validation')
  const discardT = useTranslations('academicActivities.discardDialog')

  const [title, setTitle] = useState(activity?.title ?? '')
  const [category, setCategory] = useState(activity?.category ?? '')
  const [startDate, setStartDate] = useState(activity?.startDate ?? '')
  const [endDate, setEndDate] = useState(activity?.endDate ?? '')
  const [location, setLocation] = useState(activity?.location ?? '')
  const [description, setDescription] = useState(activity?.description ?? '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [photoAlt, setPhotoAlt] = useState(activity?.photoAlt ?? '')

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const photoUrl = activity?.photoUrl ?? ''
  const hasPhoto = photoFile !== null || (Boolean(photoUrl) && !photoRemoved)

  const titleError = hasAttemptedSubmit && title.trim() === '' ? validation('title') : null
  const categoryError = hasAttemptedSubmit && category.trim() === '' ? validation('category') : null
  const startDateError =
    hasAttemptedSubmit && startDate.trim() === '' ? validation('startDate') : null
  const endDateIsBeforeStart =
    endDate.trim() !== '' && startDate.trim() !== '' && endDate < startDate
  const endDateError = hasAttemptedSubmit && endDateIsBeforeStart ? validation('endDate') : null
  const locationError = hasAttemptedSubmit && location.trim() === '' ? validation('location') : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? validation('description') : null
  const photoError = hasAttemptedSubmit && !hasPhoto ? validation('photo') : null
  const photoAltError = hasAttemptedSubmit && photoAlt.trim() === '' ? validation('photoAlt') : null

  const isFormValid =
    title.trim() !== '' &&
    category.trim() !== '' &&
    startDate.trim() !== '' &&
    !endDateIsBeforeStart &&
    location.trim() !== '' &&
    description.trim() !== '' &&
    hasPhoto &&
    photoAlt.trim() !== ''

  const isDirty =
    title !== (activity?.title ?? '') ||
    category !== (activity?.category ?? '') ||
    startDate !== (activity?.startDate ?? '') ||
    endDate !== (activity?.endDate ?? '') ||
    location !== (activity?.location ?? '') ||
    description !== (activity?.description ?? '') ||
    photoFile !== null ||
    photoRemoved ||
    photoAlt !== (activity?.photoAlt ?? '')

  function handleCancelClick() {
    if (busy) return
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      onCancel()
    }
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false)
    onCancel()
  }

  async function handleSave() {
    if (busy) return
    setHasAttemptedSubmit(true)

    if (!isFormValid) {
      if (title.trim() === '') {
        document.getElementById(`${formId}-title`)?.focus()
      } else if (category.trim() === '') {
        document.getElementById(`${formId}-category`)?.focus()
      } else if (startDate.trim() === '') {
        document.getElementById(`${formId}-start-date`)?.focus()
      } else if (endDateIsBeforeStart) {
        document.getElementById(`${formId}-end-date`)?.focus()
      } else if (location.trim() === '') {
        document.getElementById(`${formId}-location`)?.focus()
      } else if (description.trim() === '') {
        document.getElementById(`${formId}-description`)?.focus()
      } else if (photoAlt.trim() === '') {
        document.getElementById(`${formId}-photo-alt`)?.focus()
      }
      return
    }

    if (isUploading) return

    let finalPhotoUrl = photoRemoved ? '' : photoUrl
    if (photoFile) {
      setIsUploading(true)
      setUploadError(null)
      try {
        const formData = new FormData()
        formData.set('file', photoFile)
        const result = await uploadAcademicActivityImage(formData)
        if (!result.ok) {
          setIsUploading(false)
          setUploadError(result.error)
          return
        }
        finalPhotoUrl = result.imageUrl
      } catch {
        setIsUploading(false)
        setUploadError(validation('uploadFailed'))
        return
      }
      setIsUploading(false)
    }

    onSave({
      title,
      category,
      startDate,
      endDate: endDate.trim() === '' ? null : endDate,
      location,
      description,
      photoUrl: finalPhotoUrl,
      photoAlt,
    })
  }

  return (
    <div className="cms-form">
      {uploadError ? (
        <p className="form-alert" role="alert">
          {uploadError}
        </p>
      ) : null}

      <fieldset className="cms-form-fields" disabled={busy}>
        <FormField
          errorMessage={titleError}
          id={`${formId}-title`}
          label={t('titleField')}
          onChange={setTitle}
          required
          value={title}
        />

        <div className="news-article-form-row">
          <FormField
            errorMessage={categoryError}
            id={`${formId}-category`}
            label={t('categoryField')}
            onChange={setCategory}
            placeholder={t('categoryPlaceholder')}
            required
            value={category}
          />
          <FormField
            errorMessage={locationError}
            id={`${formId}-location`}
            label={t('locationField')}
            onChange={setLocation}
            required
            value={location}
          />
        </div>

        <div className="news-article-form-row">
          <FormField
            errorMessage={startDateError}
            id={`${formId}-start-date`}
            label={t('startDateField')}
            onChange={setStartDate}
            required
            type="date"
            value={startDate}
          />
          <FormField
            errorMessage={endDateError}
            id={`${formId}-end-date`}
            label={t('endDateField')}
            onChange={setEndDate}
            type="date"
            value={endDate}
          />
        </div>

        <FormField
          errorMessage={descriptionError}
          id={`${formId}-description`}
          label={t('descriptionField')}
          multiline
          onChange={setDescription}
          required
          value={description}
        />

        <FileDropInput
          errorMessage={photoError}
          existingImageUrl={!photoRemoved && photoUrl ? photoUrl : undefined}
          helperText={t('photoHelperText')}
          label={t('photoField')}
          onFileSelect={(file) => {
            setPhotoFile(file)
            setPhotoRemoved(file === null)
          }}
          required
        />

        <FormField
          errorMessage={photoAltError}
          id={`${formId}-photo-alt`}
          label={t('photoAltField')}
          onChange={setPhotoAlt}
          required
          value={photoAlt}
        />

        <div className="cms-form-actions">
          <Button onClick={handleCancelClick} variant="secondary">
            {t('cancel')}
          </Button>
          <Button disabled={isUploading} onClick={handleSave} variant="primary">
            {isUploading ? t('uploadingImage') : busy ? t('saving') : t('save')}
          </Button>
        </div>
      </fieldset>

      <StandardConfirmDialog
        cancelLabel={discardT('keepEditing')}
        confirmLabel={discardT('discard')}
        message={discardT('message')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="warning"
        title={discardT('title')}
      />
    </div>
  )
}
