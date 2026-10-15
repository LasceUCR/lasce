'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import {
  albumContent,
  type ReviewConfirmation,
  type StoredAlbumContent,
} from '@/app/lib/gallery-schema'
import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  type FormErrors,
  contentFieldLang,
  contentPath,
  draftFromStored,
  hasContentChanges,
  isConfirmed,
  languageTabFlags,
  tabWithErrors,
  validateContent,
  resetConfirmations,
  reviewsNeeded,
  withConfirmation,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import { languageLabels } from '@/app/lib/publication-form'
import { scrollIntoViewIfSupported } from '@/app/lib/scrollIntoView'

import { uploadGalleryImage, type UploadGalleryImageResult } from '@/app/(public)/galeria/actions'

type AlbumTranslatableField = 'title' | 'description'

/** The translatable text of an album in one language. */
export type AlbumFormContent = Record<AlbumTranslatableField, string>

export interface AlbumFormValues {
  title: string
  description: string
  yearsLabel: string
  /** Permanent URL already uploaded by the time `onSave` runs. */
  coverObjectKey: string
  /** Title and description per language. `title` and `description` above are the Spanish ones. */
  content?: Record<Locale, AlbumFormContent>
}

/** What `onSave` receives: `content` is left out while editing an album whose text did not change. */
export type AlbumFormSaveValues = AlbumFormValues

export interface AlbumFormProps {
  /** The album's current values — the form starts pre-filled with these. */
  album: AlbumFormValues
  /**
   * The text as stored in every language, when editing an existing album. Leave it out to create
   * one, which needs both languages in full.
   */
  stored?: StoredAlbumContent | null
  /** Called once the form is valid, with the confirmations the save still needs. */
  onSave: (values: AlbumFormSaveValues, confirmed: ReviewConfirmation[]) => void
  onCancel: () => void
}

export function AlbumForm({ album, stored = null, onSave, onCancel }: AlbumFormProps) {
  // Everything the editor says follows the site's language; the tabs only pick the translation.
  const t = useTranslations('publications')
  const uiLocale = useLocale() as Locale
  const formId = useId()
  // In a modal, the language tabs sit beside its title and stay in view while the form scrolls.
  const headerSlot = useModalHeaderSlot()

  const [initialContent] = useState<Record<Locale, AlbumFormContent>>(() => {
    if (stored) return draftFromStored(albumContent, stored)
    return (
      album.content ?? {
        es: { title: album.title, description: album.description },
        en: { title: '', description: '' },
      }
    )
  })
  const [content, setContent] = useState(initialContent)
  const [confirmed, setConfirmed] = useState<ReviewConfirmation[]>([])
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [yearsLabel, setYearsLabel] = useState(album.yearsLabel)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadErrorRef = useRef<HTMLParagraphElement>(null)

  // Visibility state for the discard confirmation dialog
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  // Track whether unsaved changes exist
  const isDirty =
    hasAttemptedSubmit ||
    locales.some(
      (locale) =>
        content[locale].title !== initialContent[locale].title ||
        content[locale].description !== initialContent[locale].description,
    ) ||
    yearsLabel !== (album.yearsLabel ?? '') ||
    coverFile !== null ||
    coverRemoved

  useEffect(() => {
    if (uploadError) {
      scrollIntoViewIfSupported(uploadErrorRef.current)
    }
  }, [uploadError])

  const hasCover = coverFile !== null || (Boolean(album.coverObjectKey) && !coverRemoved)

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

  const needed = reviewsNeeded(albumContent, stored, content)
  // An existing album saved without touching its text only updates its shared fields.
  const contentChanged = hasContentChanges(albumContent, stored, content)

  function updateContent(locale: Locale, field: AlbumTranslatableField, value: string) {
    setContent((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    setConfirmed((current) => resetConfirmations(current, field))
  }

  function reviewControl(locale: Locale, field: AlbumTranslatableField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(albumContent, review, uiLocale)}
        message={reviewMessage(albumContent, review, stored, content, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  const errors: FormErrors = hasAttemptedSubmit
    ? validateContent(albumContent, stored, content, confirmed, uiLocale)
    : {}

  function handleConfirmClick() {
    setHasAttemptedSubmit(true)
    const found = validateContent(albumContent, stored, content, confirmed, uiLocale)
    const target = tabWithErrors(found, tab)

    if (target) setTab(target)

    if (Object.keys(found).length > 0 || !hasCover) return

    handleConfirmSave()
  }

  async function handleConfirmSave() {
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

    onSave(
      {
        title: content[defaultLocale].title,
        description: content[defaultLocale].description,
        ...(contentChanged ? { content } : {}),
        yearsLabel,
        coverObjectKey,
      },
      confirmationsStillNeeded(confirmed, needed),
    )
  }

  return (
    <div className="gallery-album-form">
      <FileDropInput
        existingImageUrl={album.coverObjectKey}
        helperText="Imagen de portada del álbum, en formato JPG o PNG."
        errorMessage={
          hasAttemptedSubmit && !hasCover ? 'Es necesaria una imagen de portada.' : null
        }
        label="Imagen de portada"
        onFileSelect={(file) => {
          setCoverFile(file)
          setCoverRemoved(file === null)
        }}
      />

      <LanguageTabs
        copyLang={uiLocale}
        flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        label={t('editor.languageTabs')}
        onSelect={setTab}
        selected={tab}
        tablistContainer={headerSlot}
      >
        {(locale) => (
          <>
            <FormField
              id={`${formId}-${locale}-title`}
              label={`Título (${languageLabels[locale]})`}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => updateContent(locale, 'title', value)}
              required
              error={errors[contentPath(locale, 'title')]}
              value={content[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              id={`${formId}-${locale}-description`}
              label={`Descripción (${languageLabels[locale]})`}
              lang={contentFieldLang(stored, locale)}
              multiline
              onChange={(value) => updateContent(locale, 'description', value)}
              required
              error={errors[contentPath(locale, 'description')]}
              value={content[locale].description}
            />
            {reviewControl(locale, 'description')}
          </>
        )}
      </LanguageTabs>

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

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          Cancelar
        </Button>
        <Button disabled={isUploading} onClick={handleConfirmClick} variant="primary">
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
