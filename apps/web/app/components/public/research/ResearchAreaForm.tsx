'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import {
  uploadResearchAreaImage,
  type UploadResearchAreaImageResult,
} from '@/app/(public)/investigacion/actions'
import { FormField } from '@/app/components/public/FormField'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

/** Messages match `researchAreaInputSchema` so a rejection reads the same
 * whether it's caught here or by the server after submission. */
function requireNonEmpty(message: string) {
  return (value: string) => {
    if (value.trim() === '') throw new Error(message)
  }
}

export interface ResearchAreaFormValues {
  title: string
  description: string
  /** Permanent URL already uploaded by the time `onSave` runs. */
  src: string
}

export interface ResearchAreaFormProps {
  /** The area's current values — the form starts pre-filled with these. */
  area: ResearchAreaFormValues
  onSave: (values: ResearchAreaFormValues) => void
  onCancel: () => void
  confirmTitle?: string
  confirmMessage?: string
}

export function ResearchAreaForm({
  area,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en esta área de investigación?',
}: ResearchAreaFormProps) {
  const [title, setTitle] = useState(area.title)
  const [description, setDescription] = useState(area.description)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadErrorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (uploadError) {
      scrollIntoViewIfSupported(uploadErrorRef.current)
    }
  }, [uploadError])

  const hasPhoto = photoFile !== null || (Boolean(area?.src) && !photoRemoved)
  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'El título es obligatorio.' : null
  const imageError = hasAttemptedSubmit && !hasPhoto ? 'La imagen es obligatoria.' : null

  const isDirty =
    title !== area.title || description !== area.description || photoFile !== null || photoRemoved

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

  function handleConfirmClick() {
    setHasAttemptedSubmit(true)
    if (!hasPhoto || title.trim() === '') {
      if (title.trim() === '') {
        document.getElementById('area-title')?.focus()
      }
      return
    }

    handleConfirmSave()
  }

  async function handleConfirmSave() {
    setConfirmOpen(false)
    setUploadError(null)

    let src = area?.src ?? ''
    if (photoFile) {
      setIsUploading(true)

      let result: UploadResearchAreaImageResult
      try {
        const formData = new FormData()
        formData.set('file', photoFile)
        result = await uploadResearchAreaImage(formData)
      } catch {
        setIsUploading(false)
        setUploadError('No se pudo subir la imagen. Inténtelo de nuevo.')
        return
      }
      setIsUploading(false)

      if (!result.ok) {
        setUploadError(result.error)
        return
      }
      src = result.imageUrl
    }

    onSave({
      title,
      description,
      src,
    })
  }

  return (
    <div className="research-area-form">
      <FileDropInput
        errorMessage={imageError}
        existingImageUrl={area?.src}
        helperText="Imagen ilustrativa para el área de investigación, en formato JPG o PNG."
        label="Foto"
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
        required
      />

      <FormField
        errorMessage={titleError}
        id="area-title"
        label="Título"
        onChange={setTitle}
        required
        validate={requireNonEmpty('El título es obligatorio.')}
        value={title}
      />

      <FormField
        id="area-description"
        label="Descripción"
        multiline
        onChange={setDescription}
        value={description}
      />

      {uploadError ? (
        <p className="form-alert" ref={uploadErrorRef} role="alert">
          {uploadError}
        </p>
      ) : null}

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          Cancelar
        </Button>

        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
          {isUploading ? 'Subiendo imagen...' : 'Confirmar'}
        </Button>
      </div>

      <ConfirmDialog
        message={confirmMessage}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
        open={confirmOpen}
        title={confirmTitle}
      />

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
