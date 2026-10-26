'use client'

import { Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useId, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { Modal } from '@/app/components/public/Modal'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { useToast } from '@/app/components/public/toast/ToastProvider'
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

  // Sub-modal 1: Editar fotografías
  const [isEditPhotosOpen, setIsEditPhotosOpen] = useState(false)
  const [draftEditImages, setDraftEditImages] = useState<EditableImageItem[]>([])
  const [confirmDiscardEditPhotos, setConfirmDiscardEditPhotos] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<string | null>(null)

  // Sub-modal 2: Añadir fotografía
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false)
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null)
  const [addPhotoAlt, setAddPhotoAlt] = useState('')
  const [addPhotoError, setAddPhotoError] = useState<string | null>(null)
  const [confirmDiscardAddPhoto, setConfirmDiscardAddPhoto] = useState(false)

  // General form submission & discard
  const [isUploading, setIsUploading] = useState(false)
  const toast = useToast()
  // A failed upload is an action outcome, so it is reported with a toast (see "Feedback" in
  // `AGENTS.md`). The previous attempt's toast is dismissed on retry so errors do not pile up.
  const uploadErrorToast = useRef<number | null>(null)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [confirmDiscardGeneral, setConfirmDiscardGeneral] = useState(false)

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

  const isGeneralDirty = title !== stage.title || description !== stage.description || isImagesDirty

  // Handlers for Sub-modal 1: Editar fotografías
  function handleOpenEditPhotos() {
    setDraftEditImages(images.map((img) => ({ ...img })))
    setIsEditPhotosOpen(true)
  }

  const isDraftPhotosDirty =
    draftEditImages.length !== images.length ||
    draftEditImages.some((img, index) => {
      const orig = images[index]
      return !orig || img.id !== orig.id || img.alt !== orig.alt
    })

  function handleCloseEditPhotosClick() {
    if (isDraftPhotosDirty) {
      setConfirmDiscardEditPhotos(true)
    } else {
      setIsEditPhotosOpen(false)
    }
  }

  function handleSaveEditPhotos() {
    setImages(draftEditImages)
    setIsEditPhotosOpen(false)
  }

  function handleRequestDeleteDraftImage(id: string) {
    if (draftEditImages.length <= 1) return
    setImageToDelete(id)
  }

  function handleConfirmDeleteDraftImage() {
    if (imageToDelete) {
      setDraftEditImages((prev) => prev.filter((img) => img.id !== imageToDelete))
      setImageToDelete(null)
    }
  }

  function handleUpdateDraftImageAlt(id: string, alt: string) {
    setDraftEditImages((prev) => prev.map((img) => (img.id === id ? { ...img, alt } : img)))
  }

  // Handlers for Sub-modal 2: Añadir fotografía
  function handleOpenAddPhoto() {
    setAddPhotoFile(null)
    setAddPhotoAlt('')
    setAddPhotoError(null)
    setIsAddPhotoOpen(true)
  }

  const isAddPhotoDirty = addPhotoFile !== null || addPhotoAlt.trim() !== ''

  function handleCloseAddPhotoClick() {
    if (isAddPhotoDirty) {
      setConfirmDiscardAddPhoto(true)
    } else {
      setIsAddPhotoOpen(false)
    }
  }

  function handleConfirmAddPhoto() {
    if (!addPhotoFile) {
      setAddPhotoError('Debe seleccionar un archivo de imagen.')
      return
    }

    const previewUrl = URL.createObjectURL(addPhotoFile)
    const altText = addPhotoAlt.trim() || `Fotografía de ${title.trim() || 'la etapa'}`

    setImages((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        src: previewUrl,
        alt: altText,
        file: addPhotoFile,
      },
    ])

    setAddPhotoFile(null)
    setAddPhotoAlt('')
    setAddPhotoError(null)
    setIsAddPhotoOpen(false)
  }

  // Handlers for General Form
  function handleCancelClick() {
    if (isGeneralDirty) {
      setConfirmDiscardGeneral(true)
    } else {
      onCancel()
    }
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

    if (uploadErrorToast.current !== null) {
      toast.dismiss(uploadErrorToast.current)
      uploadErrorToast.current = null
    }

    const finalImages: ConstructionImage[] = []
    const pendingUploads = images.filter((img) => Boolean(img.file))

    if (pendingUploads.length > 0) {
      setIsUploading(true)

      try {
        for (const item of images) {
          if (item.file) {
            const formData = new FormData()
            formData.set('file', item.file)
            const result = await uploadConstructionStageImage(formData)
            if (!result.ok) {
              setIsUploading(false)
              uploadErrorToast.current = toast.show('error', result.error)
              return
            }
            finalImages.push({ src: result.imageUrl, alt: item.alt })
          } else {
            finalImages.push({ src: item.src, alt: item.alt })
          }
        }
      } catch {
        setIsUploading(false)
        uploadErrorToast.current = toast.show(
          'error',
          'Error al subir las fotografías. Inténtelo de nuevo.',
        )
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

      <div style={{ marginTop: '18px', marginBottom: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <label style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--blue-dark)' }}>
            Fotografías de la etapa
          </label>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            {images.length}{' '}
            {images.length === 1 ? 'fotografía registrada' : 'fotografías registradas'}
          </span>
        </div>

        {imagesError ? (
          <p className="form-alert" role="alert" style={{ marginBottom: '12px' }}>
            {imagesError}
          </p>
        ) : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <Button
            icon={<ImageIcon aria-hidden="true" size={16} />}
            onClick={handleOpenEditPhotos}
            type="button"
            variant="secondary"
          >
            Editar fotografías
          </Button>
          <Button
            icon={<Plus aria-hidden="true" size={16} />}
            onClick={handleOpenAddPhoto}
            type="button"
            variant="secondary"
          >
            Añadir fotografía
          </Button>
        </div>
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

      {/* Sub-modal 1: Editar fotografías */}
      <Modal
        onClose={handleCloseEditPhotosClick}
        open={isEditPhotosOpen}
        size="medium"
        title="Editar fotografías"
      >
        <div className="cms-form">
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
            Modifique la descripción accesible (alt) de cada fotografía o elimine aquellas que ya no
            correspondan a esta etapa.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '360px',
              overflowY: 'auto',
              padding: '4px',
              marginBottom: '16px',
            }}
          >
            {draftEditImages.map((img, index) => (
              <div
                key={img.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr auto',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '10px 12px',
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
                    onChange={(e) => handleUpdateDraftImageAlt(img.id, e.target.value)}
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
                    disabled={draftEditImages.length <= 1}
                    onClick={() => handleRequestDeleteDraftImage(img.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: draftEditImages.length <= 1 ? 'not-allowed' : 'pointer',
                      color: draftEditImages.length <= 1 ? 'var(--muted)' : 'var(--danger)',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                    }}
                    title={
                      draftEditImages.length <= 1
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

          <div className="cms-form-actions">
            <Button onClick={handleCloseEditPhotosClick} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button onClick={handleSaveEditPhotos} type="button" variant="primary">
              Guardar fotografías
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sub-modal 2: Añadir fotografía */}
      <Modal
        onClose={handleCloseAddPhotoClick}
        open={isAddPhotoOpen}
        size="medium"
        title="Añadir fotografía"
      >
        <div className="cms-form">
          <FileDropInput
            errorMessage={addPhotoError}
            helperText="Formatos JPG, PNG o WebP (máx. 10 MB)."
            label="Archivo de imagen"
            onFileSelect={(file) => {
              setAddPhotoFile(file)
              if (file) setAddPhotoError(null)
            }}
            required
          />

          <div style={{ marginTop: '12px' }}>
            <FormField
              id={`${formId}-add-img-alt`}
              label="Texto alternativo accesible (alt)"
              onChange={setAddPhotoAlt}
              placeholder="Descripción para personas con lectores de pantalla"
              value={addPhotoAlt}
            />
          </div>

          <div className="cms-form-actions">
            <Button onClick={handleCloseAddPhotoClick} type="button" variant="secondary">
              Cancelar
            </Button>
            <Button onClick={handleConfirmAddPhoto} type="button" variant="primary">
              Añadir fotografía
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de eliminación: Fotografía */}
      <StandardConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Eliminar"
        message="¿Está seguro de que desea eliminar esta fotografía de la etapa?"
        onCancel={() => setImageToDelete(null)}
        onConfirm={handleConfirmDeleteDraftImage}
        open={imageToDelete !== null}
        severity="danger"
        title="Eliminar fotografía"
      />

      {/* Confirmación de descarte: General */}
      <StandardConfirmDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        message="Si descarta ahora, se perderán todos los datos ingresados que no hayan sido guardados."
        onCancel={() => setConfirmDiscardGeneral(false)}
        onConfirm={() => {
          setConfirmDiscardGeneral(false)
          onCancel()
        }}
        open={confirmDiscardGeneral}
        severity="warning"
        title="Descartar cambios no guardados"
      />

      {/* Confirmación de descarte: Editar fotografías */}
      <StandardConfirmDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        message="Si descarta ahora, no se aplicarán los cambios realizados a las fotografías."
        onCancel={() => setConfirmDiscardEditPhotos(false)}
        onConfirm={() => {
          setConfirmDiscardEditPhotos(false)
          setIsEditPhotosOpen(false)
        }}
        open={confirmDiscardEditPhotos}
        severity="warning"
        title="Descartar cambios de fotografías"
      />

      {/* Confirmación de descarte: Añadir fotografía */}
      <StandardConfirmDialog
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        message="Si descarta ahora, la fotografía seleccionada no se agregará a la etapa."
        onCancel={() => setConfirmDiscardAddPhoto(false)}
        onConfirm={() => {
          setConfirmDiscardAddPhoto(false)
          setIsAddPhotoOpen(false)
        }}
        open={confirmDiscardAddPhoto}
        severity="warning"
        title="Descartar nueva fotografía"
      />
    </div>
  )
}
