'use client'

import { Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useId, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { uploadConstructionStageImage } from '@/app/(public)/radioastronomia/actions'
import type { ConstructionImage } from '@/app/lib/rosac-construction'

export interface RosacStageFormValues {
  title: string
  description: string
  images?: readonly ConstructionImage[]
}

export interface RosacStageFormProps {
  stage: RosacStageFormValues
  onSave: (values: RosacStageFormValues) => void | Promise<void>
  onCancel: () => void
}

interface EditableImageItem {
  id: string
  src: string
  alt: string
  file?: File | null
}

export function RosacStageForm({ stage, onSave, onCancel }: RosacStageFormProps) {
  const formId = useId()
  const [title, setTitle] = useState(stage.title)
  const [description, setDescription] = useState(stage.description)

  const initialImages: EditableImageItem[] = (stage.images ?? []).map((img, index) => ({
    id: `img-${index}-${img.src}`,
    src: img.src,
    alt: img.alt,
  }))

  const [images, setImages] = useState<EditableImageItem[]>(initialImages)
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [newImageAlt, setNewImageAlt] = useState('')
  const [newImageError, setNewImageError] = useState<string | null>(null)
  const [isAddingImage, setIsAddingImage] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const titleError = hasAttemptedSubmit && title.trim() === '' ? 'El título es obligatorio.' : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? 'La descripción es obligatoria.' : null
  const imagesError =
    hasAttemptedSubmit && images.length === 0
      ? 'La etapa debe contener al menos una fotografía.'
      : null

  const isFormValid = title.trim() !== '' && description.trim() !== '' && images.length > 0

  const isImagesDirty =
    images.length !== initialImages.length ||
    images.some((img, index) => {
      const orig = initialImages[index]
      return !orig || img.src !== orig.src || img.alt !== orig.alt || Boolean(img.file)
    })

  const isDirty =
    title !== stage.title ||
    description !== stage.description ||
    isImagesDirty ||
    newImageFile !== null ||
    newImageAlt.trim() !== ''

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
    } else {
      onCancel()
    }
  }

  function handleRemoveImage(id: string) {
    if (images.length <= 1) return
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  function handleUpdateImageAlt(id: string, alt: string) {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, alt } : img)))
  }

  function handleAddPhoto() {
    if (!newImageFile) {
      setNewImageError('Debe seleccionar un archivo de imagen.')
      return
    }

    const previewUrl = URL.createObjectURL(newImageFile)
    const altText = newImageAlt.trim() || `Fotografía de ${title.trim() || 'la etapa'}`

    setImages((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        src: previewUrl,
        alt: altText,
        file: newImageFile,
      },
    ])

    setNewImageFile(null)
    setNewImageAlt('')
    setNewImageError(null)
    setIsAddingImage(false)
  }

  async function handleConfirmClick() {
    setHasAttemptedSubmit(true)
    if (!isFormValid) {
      if (title.trim() === '') {
        document.getElementById(`${formId}-title`)?.focus()
      } else if (description.trim() === '') {
        document.getElementById(`${formId}-description`)?.focus()
      }
      return
    }

    if (isUploading) return

    // Process image uploads if any files are pending
    const finalImages: ConstructionImage[] = []
    const pendingUploads = images.filter((img) => Boolean(img.file))

    if (pendingUploads.length > 0) {
      setIsUploading(true)
      setUploadError(null)

      try {
        for (const item of images) {
          if (item.file) {
            const formData = new FormData()
            formData.set('file', item.file)
            const result = await uploadConstructionStageImage(formData)
            if (!result.ok) {
              setIsUploading(false)
              setUploadError(result.error)
              return
            }
            finalImages.push({ src: result.imageUrl, alt: item.alt })
          } else {
            finalImages.push({ src: item.src, alt: item.alt })
          }
        }
      } catch {
        setIsUploading(false)
        setUploadError('Error al subir las fotografías. Inténtelo de nuevo.')
        return
      }

      setIsUploading(false)
    } else {
      for (const item of images) {
        finalImages.push({ src: item.src, alt: item.alt })
      }
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      images: finalImages,
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

      <div style={{ marginTop: '16px', marginBottom: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <label style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--blue-dark)' }}>
            Fotografías de la etapa ({images.length})
          </label>
          {!isAddingImage && (
            <Button
              icon={<Plus aria-hidden="true" size={16} />}
              onClick={() => setIsAddingImage(true)}
              type="button"
              variant="secondary"
            >
              Añadir fotografía
            </Button>
          )}
        </div>

        {imagesError ? (
          <p className="form-alert" role="alert" style={{ marginBottom: '12px' }}>
            {imagesError}
          </p>
        ) : null}

        {/* Existing photos list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '4px',
            marginBottom: '14px',
          }}
        >
          {images.map((img, index) => (
            <div
              key={img.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr auto',
                gap: '12px',
                alignItems: 'center',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: '#fafafa',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '70px',
                  height: '52px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: '#e2e8f0',
                }}
              >
                {img.src ? (
                  <Image
                    alt={img.alt || `Foto ${index + 1}`}
                    fill
                    sizes="70px"
                    src={img.src}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                    }}
                  >
                    <ImageIcon aria-hidden="true" size={20} />
                  </div>
                )}
              </div>

              <div>
                <input
                  aria-label={`Texto alternativo de la fotografía ${index + 1}`}
                  onChange={(e) => handleUpdateImageAlt(img.id, e.target.value)}
                  placeholder="Texto alternativo accesible de la fotografía"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    fontSize: '0.85rem',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                  }}
                  type="text"
                  value={img.alt}
                />
              </div>

              <div>
                <button
                  aria-label={`Eliminar fotografía ${index + 1}`}
                  disabled={images.length <= 1}
                  onClick={() => handleRemoveImage(img.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: images.length <= 1 ? 'not-allowed' : 'pointer',
                    color: images.length <= 1 ? 'var(--muted)' : 'var(--danger)',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                  }}
                  title={
                    images.length <= 1
                      ? 'Debe haber al menos una foto en la etapa'
                      : 'Eliminar esta fotografía'
                  }
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Form to add a new photo */}
        {isAddingImage && (
          <div
            style={{
              padding: '12px',
              border: '1px dashed var(--action)',
              borderRadius: '8px',
              background: '#f8fafc',
              marginBottom: '16px',
            }}
          >
            <h4
              style={{
                margin: '0 0 10px',
                fontSize: '0.9rem',
                color: 'var(--blue-dark)',
              }}
            >
              Nueva fotografía
            </h4>

            <FileDropInput
              errorMessage={newImageError}
              helperText="Formatos JPG, PNG o WebP (máx. 10 MB)."
              label="Archivo de imagen"
              onFileSelect={(file) => {
                setNewImageFile(file)
                if (file) setNewImageError(null)
              }}
              required
            />

            <div style={{ marginTop: '10px' }}>
              <FormField
                id={`${formId}-new-img-alt`}
                label="Texto alternativo accesible (alt)"
                onChange={setNewImageAlt}
                placeholder="Descripción para personas con lectores de pantalla"
                value={newImageAlt}
              />
            </div>

            <div
              style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}
            >
              <Button
                onClick={() => {
                  setIsAddingImage(false)
                  setNewImageFile(null)
                  setNewImageAlt('')
                  setNewImageError(null)
                }}
                type="button"
                variant="secondary"
              >
                Cancelar foto
              </Button>
              <Button onClick={handleAddPhoto} type="button" variant="primary">
                Guardar foto en la etapa
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} type="button" variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} type="button" variant="primary">
          {isUploading ? (
            <>
              <Loader2 aria-hidden="true" className="btn-spinner" size={16} />
              <span>Subiendo fotografías...</span>
            </>
          ) : (
            'Confirmar'
          )}
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
