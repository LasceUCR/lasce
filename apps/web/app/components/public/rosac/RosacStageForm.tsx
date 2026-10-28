'use client'

import { Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useId, useRef, useState } from 'react'
import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('rosac.editor')
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

  const titleError = hasAttemptedSubmit && title.trim() === '' ? t('stages.titleRequired') : null
  const descriptionError =
    hasAttemptedSubmit && description.trim() === '' ? t('stages.descriptionRequired') : null
  const imagesError = hasAttemptedSubmit && images.length === 0 ? t('stages.imagesRequired') : null

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
      setAddPhotoError(t('stages.addModal.fileRequired'))
      return
    }

    const previewUrl = URL.createObjectURL(addPhotoFile)
    const altText =
      addPhotoAlt.trim() ||
      t('stages.addModal.altDefault', {
        title: title.trim() || t('stages.defaultModalTitle'),
      })

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
        setUploadError(t('stages.uploadError'))
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
        label={t('stages.titleLabel')}
        onChange={setTitle}
        required
        value={title}
      />

      <FormField
        errorMessage={descriptionError}
        id={`${formId}-description`}
        label={t('stages.descriptionLabel')}
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
            {t('stages.photosTitle')}
          </label>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            {t('stages.registeredCount', { count: images.length })}
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
            {t('stages.editPhotos')}
          </Button>
          <Button
            icon={<Plus aria-hidden="true" size={16} />}
            onClick={handleOpenAddPhoto}
            type="button"
            variant="secondary"
          >
            {t('stages.addPhoto')}
          </Button>
        </div>
      </div>

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} type="button" variant="secondary">
          {t('stages.cancel')}
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} type="button" variant="primary">
          {isUploading ? (
            <>
              <Loader2 aria-hidden="true" className="btn-spinner" size={16} />
              <span>{t('stages.uploading')}</span>
            </>
          ) : (
            t('stages.save')
          )}
        </Button>
      </div>

      {/* Sub-modal 1: Editar fotografías */}
      <Modal
        onClose={handleCloseEditPhotosClick}
        open={isEditPhotosOpen}
        size="medium"
        title={t('stages.editModal.title')}
      >
        <div className="cms-form">
          <p style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'var(--muted)' }}>
            {t('stages.editModal.help')}
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
                    aria-label={t('stages.editModal.altLabel', { index: index + 1 })}
                    onChange={(e) => handleUpdateDraftImageAlt(img.id, e.target.value)}
                    placeholder={t('stages.editModal.altPlaceholder')}
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
                    aria-label={t('stages.editModal.deleteLabel', { index: index + 1 })}
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
                        ? t('stages.editModal.deleteMinTitle')
                        : t('stages.editModal.deleteTooltip')
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
              {t('stages.editModal.cancel')}
            </Button>
            <Button onClick={handleSaveEditPhotos} type="button" variant="primary">
              {t('stages.editModal.savePhotos')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sub-modal 2: Añadir fotografía */}
      <Modal
        onClose={handleCloseAddPhotoClick}
        open={isAddPhotoOpen}
        size="medium"
        title={t('stages.addModal.title')}
      >
        <div className="cms-form">
          <FileDropInput
            errorMessage={addPhotoError}
            helperText={t('stages.addModal.fileHelp')}
            label={t('stages.addModal.fileLabel')}
            onFileSelect={(file) => {
              setAddPhotoFile(file)
              if (file) setAddPhotoError(null)
            }}
            required
          />

          <div style={{ marginTop: '12px' }}>
            <FormField
              id={`${formId}-add-img-alt`}
              label={t('stages.addModal.altLabel')}
              onChange={setAddPhotoAlt}
              placeholder={t('stages.addModal.altPlaceholder')}
              value={addPhotoAlt}
            />
          </div>

          <div className="cms-form-actions">
            <Button onClick={handleCloseAddPhotoClick} type="button" variant="secondary">
              {t('stages.addModal.cancel')}
            </Button>
            <Button onClick={handleConfirmAddPhoto} type="button" variant="primary">
              {t('stages.addModal.submit')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de eliminación: Fotografía */}
      <StandardConfirmDialog
        cancelLabel={t('stages.editModal.deleteDialog.cancel')}
        confirmLabel={t('stages.editModal.deleteDialog.confirm')}
        message={t('stages.editModal.deleteDialog.message')}
        onCancel={() => setImageToDelete(null)}
        onConfirm={handleConfirmDeleteDraftImage}
        open={imageToDelete !== null}
        severity="danger"
        title={t('stages.editModal.deleteDialog.title')}
      />

      {/* Confirmación de descarte: General */}
      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('discardDialog.message')}
        onCancel={() => setConfirmDiscardGeneral(false)}
        onConfirm={() => {
          setConfirmDiscardGeneral(false)
          onCancel()
        }}
        open={confirmDiscardGeneral}
        severity="warning"
        title={t('discardDialog.title')}
      />

      {/* Confirmación de descarte: Editar fotografías */}
      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('stages.editModal.discardDialog.message')}
        onCancel={() => setConfirmDiscardEditPhotos(false)}
        onConfirm={() => {
          setConfirmDiscardEditPhotos(false)
          setIsEditPhotosOpen(false)
        }}
        open={confirmDiscardEditPhotos}
        severity="warning"
        title={t('stages.editModal.discardDialog.title')}
      />

      {/* Confirmación de descarte: Añadir fotografía */}
      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('stages.addModal.discardDialog.message')}
        onCancel={() => setConfirmDiscardAddPhoto(false)}
        onConfirm={() => {
          setConfirmDiscardAddPhoto(false)
          setIsAddPhotoOpen(false)
        }}
        open={confirmDiscardAddPhoto}
        severity="warning"
        title={t('stages.addModal.discardDialog.title')}
      />
    </div>
  )
}
