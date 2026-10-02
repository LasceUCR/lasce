'use client'

import { useEffect, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

import { uploadGalleryImage, type UploadGalleryImageResult } from '@/app/(public)/galeria/actions'

export interface AlbumFormValues {
  title: string
  description: string
  yearsLabel: string
  /** Permanent URL already uploaded by the time `onSave` runs. */
  coverObjectKey: string
}

export interface AlbumFormProps {
  /** The album's current values — the form starts pre-filled with these. */
  album: AlbumFormValues
  onSave: (values: AlbumFormValues) => void
  onCancel: () => void
  confirmTitle?: string
  confirmMessage?: string
}

export function AlbumForm({
  album,
  onSave,
  onCancel,
  confirmTitle = 'Guardar cambios',
  confirmMessage = '¿Desea guardar los cambios en este álbum?',
}: AlbumFormProps) {
  const [title, setTitle] = useState(album.title)
  const [description, setDescription] = useState(album.description)
  const [yearsLabel, setYearsLabel] = useState(album.yearsLabel)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)

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

  const hasCover = coverFile !== null || (Boolean(album.coverObjectKey) && !coverRemoved)

  function validateTitle(value: string) {
    if (value.trim() === '') {
      throw new Error('Es necesario un título.')
    }
  }

  function validateDescription(value: string) {
    if (value.trim() === '') {
      throw new Error('Es necesario una descripción.')
    }
  }

  function missingFields(): string[] {
    const missing: string[] = []

    if (title.trim() === '') missing.push('Título')
    if (description.trim() === '') missing.push('Descripción')
    if (!hasCover) missing.push('Imagen de portada')

    return missing
  }

  function handleConfirmClick() {
    const missing = missingFields()

    if (missing.length > 0) {
      setValidationError(`Falta completar: ${missing.join(', ')}.`)
      return
    }

    setValidationError(null)
    handleConfirmSave()
  }

  async function handleConfirmSave() {
    setConfirmOpen(false)
    setUploadError(null)

    let coverObjectKey = album.coverObjectKey

    if (coverFile) {
      setIsUploading(true)

      let result: UploadGalleryImageResult

      try {
        const formData = new FormData()
        formData.set('file', coverFile)

        result = await uploadGalleryImage(formData)
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

      coverObjectKey = result.imageUrl
    }

    if (coverRemoved && !coverFile) {
      coverObjectKey = ''
    }

    onSave({
      title,
      description,
      yearsLabel,
      coverObjectKey,
    })
  }

  return (
    <div className="gallery-album-form">
      <FileDropInput
        existingImageUrl={album.coverObjectKey}
        helperText="Imagen de portada del álbum, en formato JPG o PNG."
        label="Imagen de portada"
        onFileSelect={(file) => {
          setCoverFile(file)
          setCoverRemoved(file === null)
          setValidationError(null)
        }}
      />

      <FormField
        id="album-title"
        label="Título"
        onChange={(value) => {
          setTitle(value)
        }}
        required
        validate={validateTitle}
        value={title}
      />

      <FormField
        id="album-description"
        label="Descripción"
        multiline
        onChange={(value) => {
          setDescription(value)
        }}
        required
        validate={validateDescription}
        value={description}
      />

      <FormField
        id="album-years-label"
        label="Años"
        onChange={(value) => setYearsLabel(value)}
        value={yearsLabel}
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
