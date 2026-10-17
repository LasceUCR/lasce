'use client'

import { useId, useState } from 'react'

import { uploadAcademicActivityImage } from '@/app/(public)/actividades-academicas/actions'
import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import type { AcademicActivity } from '@/app/lib/academic-activities'

/** Messages match `academicActivityInputSchema` (apps/web/app/lib/academic-activities.ts) so a
 * rejection reads the same whether it's caught here or by the server after submission. */
function requireNonEmpty(message: string) {
  return (value: string) => {
    if (value.trim() === '') throw new Error(message)
  }
}

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
}

export function AcademicActivityForm({ activity, onSave, onCancel }: AcademicActivityFormProps) {
  const formId = useId()

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

  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'El título es obligatorio.' : null
  const categoryError =
    hasAttemptedSubmit && category.trim() === '' ? 'La categoría es obligatoria.' : null
  const startDateError =
    hasAttemptedSubmit && startDate.trim() === '' ? 'La fecha de inicio es obligatoria.' : null
  const locationError =
    hasAttemptedSubmit && location.trim() === '' ? 'La ubicación es obligatoria.' : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? 'La descripción es obligatoria.' : null
  const photoError = hasAttemptedSubmit && !hasPhoto ? 'La imagen es obligatoria.' : null
  const photoAltError =
    hasAttemptedSubmit && photoAlt.trim() === ''
      ? 'El texto alternativo de la imagen es obligatorio.'
      : null

  const isFormValid =
    title.trim() !== '' &&
    category.trim() !== '' &&
    startDate.trim() !== '' &&
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
    setHasAttemptedSubmit(true)

    if (!isFormValid) {
      if (title.trim() === '') {
        document.getElementById(`${formId}-title`)?.focus()
      } else if (category.trim() === '') {
        document.getElementById(`${formId}-category`)?.focus()
      } else if (startDate.trim() === '') {
        document.getElementById(`${formId}-start-date`)?.focus()
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
        setUploadError('No se pudo subir la imagen. Inténtelo de nuevo.')
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

      <FormField
        errorMessage={titleError}
        id={`${formId}-title`}
        label="Título"
        onChange={setTitle}
        required
        validate={requireNonEmpty('El título es obligatorio.')}
        value={title}
      />

      <div className="news-article-form-row">
        <FormField
          errorMessage={categoryError}
          id={`${formId}-category`}
          label="Categoría"
          onChange={setCategory}
          placeholder="Taller, charla, curso, conferencia..."
          required
          validate={requireNonEmpty('La categoría es obligatoria.')}
          value={category}
        />
        <FormField
          errorMessage={locationError}
          id={`${formId}-location`}
          label="Ubicación"
          onChange={setLocation}
          required
          validate={requireNonEmpty('La ubicación es obligatoria.')}
          value={location}
        />
      </div>

      <div className="news-article-form-row">
        <FormField
          errorMessage={startDateError}
          id={`${formId}-start-date`}
          label="Fecha de inicio"
          onChange={setStartDate}
          required
          type="date"
          validate={requireNonEmpty('La fecha de inicio es obligatoria.')}
          value={startDate}
        />
        <FormField
          id={`${formId}-end-date`}
          label="Fecha de finalización"
          onChange={setEndDate}
          type="date"
          value={endDate}
        />
      </div>

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label="Descripción"
        multiline
        onChange={setDescription}
        required
        validate={requireNonEmpty('La descripción es obligatoria.')}
        value={description}
      />

      <FileDropInput
        errorMessage={photoError}
        existingImageUrl={!photoRemoved && photoUrl ? photoUrl : undefined}
        helperText="Imagen ilustrativa de la actividad, en formato JPG, PNG, WebP o GIF."
        label="Imagen"
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
        required
      />

      <FormField
        errorMessage={photoAltError}
        id={`${formId}-photo-alt`}
        label="Texto alternativo de la imagen (Accesibilidad)"
        onChange={setPhotoAlt}
        required
        validate={requireNonEmpty('El texto alternativo de la imagen es obligatorio.')}
        value={photoAlt}
      />

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isUploading} onClick={handleSave} variant="primary">
          {isUploading ? 'Subiendo imagen...' : 'Confirmar'}
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
