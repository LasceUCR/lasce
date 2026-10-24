'use client'

import { Image as ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { Modal } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { uploadConstructionStageImage } from '@/app/(public)/radioastronomia/actions'
import { defaultLocale, isLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  contentPath,
  draftFromStored,
  hasContentChanges,
  isConfirmed,
  languageTabFlags,
  resetConfirmations,
  reviewsNeeded,
  tabWithErrors,
  toContentInput,
  validateContent,
  withConfirmation,
  type ContentDraft,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import {
  rosacStageContent,
  type RosacStageField,
  type RosacStageUpdateInput,
} from '@/app/lib/rosac-schema'
import type { ConstructionImage, ConstructionStage } from '@/app/lib/rosac-construction'

export type RosacStageFormBody = RosacStageUpdateInput

export interface RosacStageFormProps {
  stage: ConstructionStage
  onSave: (body: RosacStageFormBody) => void | Promise<void>
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
  const siteLocale = useLocale()
  const uiLocale: Locale = isLocale(siteLocale) ? siteLocale : defaultLocale
  const stored = stage.editing?.content ?? {
    es: { title: stage.title, description: stage.description },
    en: null,
  }

  const formRef = useRef<HTMLDivElement>(null)
  const formId = useId()

  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [draft, setDraft] = useState<ContentDraft<RosacStageField>>(() =>
    draftFromStored(rosacStageContent, stored),
  )
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<RosacStageField>[]>([])
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)

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
  const [confirmDiscardGeneral, setConfirmDiscardGeneral] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  const needed = reviewsNeeded(rosacStageContent, stored, draft)
  const errors = attempted
    ? validateContent(rosacStageContent, stored, draft, confirmed, uiLocale)
    : {}

  const contentChanged = hasContentChanges(rosacStageContent, stored, draft)
  const imagesChanged =
    images.length !== initialImages.length ||
    images.some(
      (img, i) =>
        img.file !== undefined ||
        img.src !== initialImages[i]?.src ||
        img.alt !== initialImages[i]?.alt,
    )

  const isGeneralDirty = contentChanged || imagesChanged

  function setContent(locale: Locale, field: RosacStageField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    setConfirmed((current) => resetConfirmations(current, field))
  }

  // Handlers for Sub-modal 1: Editar fotografías
  function handleOpenEditPhotos() {
    setDraftEditImages(images.map((img) => ({ ...img })))
    setIsEditPhotosOpen(true)
  }

  const isEditPhotosDirty =
    draftEditImages.length !== images.length ||
    draftEditImages.some((img, i) => img.alt !== images[i]?.alt)

  function handleCloseEditPhotosClick() {
    if (isEditPhotosDirty) {
      setConfirmDiscardEditPhotos(true)
    } else {
      setIsEditPhotosOpen(false)
    }
  }

  function handleSaveEditPhotos() {
    setImages(draftEditImages)
    setIsEditPhotosOpen(false)
  }

  function handleDeleteDraftImageClick(id: string) {
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
    const currentTitle = draft[defaultLocale].title.trim()
    const altText =
      addPhotoAlt.trim() ||
      t('stages.addModal.altDefault', { title: currentTitle || t('stages.editStage') })

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
    setAttempted(true)
    const found = validateContent(rosacStageContent, stored, draft, confirmed, uiLocale)

    if (Object.keys(found).length > 0) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((current) => current + 1)
      return
    }

    if (!contentChanged && !imagesChanged) {
      onCancel()
      return
    }

    if (isUploading) return

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
        setUploadError(t('stages.uploadError'))
        return
      }

      setIsUploading(false)
    } else {
      for (const item of images) {
        finalImages.push({ src: item.src, alt: item.alt })
      }
    }

    const version = stage.editing?.version ?? ''
    const content = toContentInput(rosacStageContent, draft)

    onSave({
      version,
      ...(imagesChanged ? { images: finalImages } : {}),
      ...(contentChanged
        ? { content, confirmedUnchanged: confirmationsStillNeeded(confirmed, needed) }
        : {}),
    })
  }

  function reviewControl(locale: Locale, field: RosacStageField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(rosacStageContent, review, uiLocale)}
        message={reviewMessage(rosacStageContent, review, stored, draft, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  return (
    <div className="cms-form" ref={formRef}>
      {uploadError ? (
        <p className="form-alert" role="alert">
          {uploadError}
        </p>
      ) : null}

      <LanguageTabs
        copyLang={uiLocale}
        flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        label={t('languageTabs')}
        onSelect={setTab}
        selected={tab}
      >
        {(locale) => (
          <>
            {stage.editing?.isLegacy && locale === defaultLocale ? (
              <Notice>{t('legacyBaseText')}</Notice>
            ) : null}

            {stage.editing?.isLegacy && locale !== defaultLocale ? (
              <Notice tone="warning">{t('legacyNoTranslation')}</Notice>
            ) : null}

            <FormField
              error={errors[contentPath(locale, 'title')]}
              id={`${formId}-${locale}-title`}
              label={t('titleIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => setContent(locale, 'title', value)}
              required
              value={draft[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'description')]}
              id={`${formId}-${locale}-description`}
              label={t('descriptionIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              multiline
              onChange={(value) => setContent(locale, 'description', value)}
              required
              value={draft[locale].description}
            />
            {reviewControl(locale, 'description')}
          </>
        )}
      </LanguageTabs>

      {/* Gestión de Fotografías */}
      <div className="cms-form-field">
        <span className="cms-form-field-label">{t('stages.photosTitle')}</span>
        <p className="form-field-hint" style={{ marginTop: '-4px', marginBottom: '12px' }}>
          {t('stages.registeredCount', { count: images.length })}
        </p>

        <div
          className="cms-stage-photo-actions"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            width: '100%',
          }}
        >
          <Button
            icon={<ImageIcon size={16} />}
            onClick={handleOpenEditPhotos}
            type="button"
            variant="secondary"
          >
            {t('stages.editPhotos')} ({images.length})
          </Button>
          <Button
            icon={<Plus size={16} />}
            onClick={handleOpenAddPhoto}
            type="button"
            variant="secondary"
          >
            {t('stages.addPhoto')}
          </Button>
        </div>
      </div>

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          {t('cancel')}
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
          {isUploading ? (
            <>
              <Loader2 className="animate-spin" size={16} style={{ marginRight: '6px' }} />
              {t('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
      </div>

      {/* Sub-modal 1: Editar fotografías */}
      <Modal
        onClose={handleCloseEditPhotosClick}
        open={isEditPhotosOpen}
        size="large"
        title={t('stages.editModal.title')}
      >
        <div className="cms-form">
          <p className="form-field-hint">{t('stages.editModal.help')}</p>

          {draftEditImages.length === 0 ? (
            <div className="notice notice-info">
              <p>{t('stages.editModal.noPhotos')}</p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                maxHeight: '50vh',
                overflowY: 'auto',
                paddingRight: '8px',
              }}
            >
              {draftEditImages.map((img) => (
                <div
                  key={img.id}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    padding: '12px',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '80px',
                      height: '60px',
                      flexShrink: 0,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: 'var(--color-bg-tertiary)',
                    }}
                  >
                    <Image
                      alt={img.alt || t('stages.editModal.altPlaceholder')}
                      fill
                      sizes="80px"
                      src={img.src}
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <FormField
                      id={`edit-alt-${img.id}`}
                      label={t('stages.editModal.altLabel')}
                      onChange={(val) => handleUpdateDraftImageAlt(img.id, val)}
                      placeholder={t('stages.editModal.altPlaceholder')}
                      value={img.alt}
                    />
                  </div>

                  <button
                    aria-label={t('stages.editModal.deleteLabel')}
                    className="icon-button icon-button--danger"
                    onClick={() => handleDeleteDraftImageClick(img.id)}
                    style={{ alignSelf: 'flex-end', marginBottom: '8px' }}
                    type="button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}

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
        cancelLabel={t('discardCancel')}
        confirmLabel={t('discardConfirm')}
        message={t('discardMessage')}
        onCancel={() => setConfirmDiscardGeneral(false)}
        onConfirm={() => {
          setConfirmDiscardGeneral(false)
          onCancel()
        }}
        open={confirmDiscardGeneral}
        severity="warning"
        title={t('discardTitle')}
      />

      {/* Confirmación de descarte: Editar fotografías */}
      <StandardConfirmDialog
        cancelLabel={t('discardCancel')}
        confirmLabel={t('discardConfirm')}
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
        cancelLabel={t('discardCancel')}
        confirmLabel={t('discardConfirm')}
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
