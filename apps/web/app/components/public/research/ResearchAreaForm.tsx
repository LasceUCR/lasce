'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import {
  uploadResearchAreaImage,
  type UploadResearchAreaImageResult,
} from '@/app/(public)/investigacion/actions'
import { FormField } from '@/app/components/public/FormField'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

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
  const [validationError, setValidationError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadErrorRef = useRef<HTMLParagraphElement>(null)
  const validationErrorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (uploadError) {
      scrollIntoViewIfSupported(uploadErrorRef.current)
    }
  }, [uploadError])

  useEffect(() => {
    if (validationError) {
      scrollIntoViewIfSupported(validationErrorRef.current)
    }
  }, [validationError])

  const hasPhoto = photoFile !== null || (Boolean(area?.src) && !photoRemoved)

  function validateTitle(value: string) {
    if (value.trim() === '') {
      throw new Error('Es necesario un título.')
    }
  }

  function missingFields(): string[] {
    const missing: string[] = []
    if (!hasPhoto) missing.push('Foto')
    if (title.trim() === '') missing.push('Título')
    return missing
  }

  function handleConfirmClick() {
    const missing = missingFields()
    if (missing.length > 0) {
      setValidationError(`Falta completar: ${missing.join(', ')}.`)
      return
    }

    setValidationError(null)
    setConfirmOpen(true)
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
        existingImageUrl={area?.src}
        helperText="Imagen ilustrativa para el área de investigación, en formato JPG o PNG."
        label="Foto"
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
          setValidationError(null)
        }}
      />

      <FormField
        id="area-title"
        label="Título"
        onChange={(value) => {
          setTitle(value)
          setValidationError(null)
        }}
        required
        validate={validateTitle}
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

      {validationError ? (
        <p className="form-alert" ref={validationErrorRef} role="alert">
          {validationError}
        </p>
      ) : null}

      <div className="cms-form-actions">
        <Button onClick={onCancel} variant="secondary">
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
    </div>
  )
}
