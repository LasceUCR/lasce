'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useId, useImperativeHandle, useState, type Ref } from 'react'

import { uploadGalleryImage } from '@/app/(public)/galeria/actions'
import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import {
  mediaContent,
  type MediaReviewConfirmation,
  type StoredMediaContent,
} from '@/app/lib/gallery-schema'
import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'
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
  validateContent,
  withConfirmation,
  type FormErrors,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import { languageLabels } from '@/app/lib/publication-form'

const spanOptions: FormFieldOption[] = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
]

type MediaTranslatableField = 'title' | 'description' | 'altText'

/** The translatable text of a file in one language. */
export type MediaFormContent = Record<MediaTranslatableField, string>

export interface MediaFormValues {
  id: string
  title: string
  description: string
  alt: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  colSpan: string
  rowSpan: string
  src?: string
  format: string
}

export interface MediaFormHandle {
  /** Closes the form, asking first when there are unsaved changes. */
  requestCancel: () => void
}

export interface MediaFormProps {
  ref?: Ref<MediaFormHandle>
  /** The file being edited. Without it, the form adds a new file. */
  media?: MediaFormValues
  /** The text as stored in every language, and the version it was loaded at, when editing. */
  stored?: StoredMediaContent | null
  version?: string
  /** True when the file predates translations, so its base text may not be in Spanish. */
  isLegacy?: boolean
  /** The album the image is added to. */
  albumId: string
  /** The signed-in user's name, recorded as the uploader. */
  uploader: string
  /** Runs once the image is uploaded and registered in the album. */
  onSaved: () => void
  onCancel: () => void
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toUpperCase()
  if (fromName && fromName !== file.name.toUpperCase()) return fromName
  return file.type.split('/')[1] ?? ''
}

export function MediaForm({
  albumId,
  uploader,
  media,
  stored = null,
  version,
  isLegacy = false,
  onSaved,
  onCancel,
  ref,
}: MediaFormProps) {
  const isEdit = media !== undefined
  const t = useTranslations('publications')
  const tGallery = useTranslations('gallery')
  const uiLocale = useLocale() as Locale
  const formId = useId()
  const headerSlot = useModalHeaderSlot()
  const toast = useToast()
  const sendWithFeedback = useRequestFeedback()

  const [initialContent] = useState<Record<Locale, MediaFormContent>>(() => {
    if (stored) return draftFromStored(mediaContent, stored)
    return {
      es: {
        title: media?.title ?? '',
        description: media?.description ?? '',
        altText: media?.alt ?? '',
      },
      en: { title: '', description: '', altText: '' },
    }
  })
  const [content, setContent] = useState(initialContent)
  const [confirmed, setConfirmed] = useState<MediaReviewConfirmation[]>([])
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [file, setFile] = useState<File | null>(null)
  const [date, setDate] = useState(media?.date ?? todayIso())
  const [colSpan, setColSpan] = useState<string>(media?.colSpan ?? '1')
  const [rowSpan, setRowSpan] = useState<string>(media?.rowSpan ?? '1')

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const isDirty =
    hasAttemptedSubmit ||
    file !== null ||
    locales.some((locale) =>
      (['title', 'description', 'altText'] as const).some(
        (field) => content[locale][field] !== initialContent[locale][field],
      ),
    ) ||
    date !== (media?.date ?? todayIso()) ||
    colSpan !== (media?.colSpan ?? '1') ||
    rowSpan !== (media?.rowSpan ?? '1')

  const needed = reviewsNeeded(mediaContent, stored, content)
  // An existing file saved without touching its text only updates its shared fields.
  const contentChanged = hasContentChanges(mediaContent, stored, content)
  const errors: FormErrors = hasAttemptedSubmit
    ? validateContent(mediaContent, stored, content, confirmed, uiLocale)
    : {}
  const missingFile = !isEdit && file === null

  function updateContent(locale: Locale, field: MediaTranslatableField, value: string) {
    setContent((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    setConfirmed((current) => resetConfirmations(current, field))
  }

  function reviewControl(locale: Locale, field: MediaTranslatableField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(mediaContent, review, uiLocale)}
        message={reviewMessage(mediaContent, review, stored, content, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  function requestCancel() {
    if (isDirty) setConfirmDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  async function handleSubmit() {
    if (isSaving) return

    setHasAttemptedSubmit(true)
    const found = validateContent(mediaContent, stored, content, confirmed, uiLocale)
    const target = tabWithErrors(found, tab)
    if (target) setTab(target)
    if (Object.keys(found).length > 0 || missingFile || date === '') return
    if (isEdit && !version) {
      toast.show('error', 'No se pudo actualizar la imagen. Recargue la página.')
      return
    }

    setIsSaving(true)

    try {
      let objectKey: string | undefined
      let format: string | undefined

      if (file !== null) {
        const formData = new FormData()
        formData.set('file', file)

        let upload: Awaited<ReturnType<typeof uploadGalleryImage>>
        try {
          upload = await uploadGalleryImage(formData)
        } catch {
          toast.show('error', 'No se pudo subir la imagen. Inténtelo de nuevo.')
          return
        }

        if (!upload.ok) {
          toast.show('error', upload.error)
          return
        }

        objectKey = upload.imageUrl
        format = formatFromFile(file)
      }

      const fields = {
        date,
        colSpan: Number(colSpan),
        rowSpan: Number(rowSpan),
        ...(objectKey !== undefined ? { objectKey, format } : {}),
      }

      const body = media
        ? {
            version,
            ...fields,
            ...(contentChanged
              ? { content, confirmedUnchanged: confirmationsStillNeeded(confirmed, needed) }
              : {}),
          }
        : { ...fields, content, isVideo: false, uploader }

      await sendWithFeedback(
        media ? `/api/gallery/media/${media.id}` : `/api/gallery/albums/${albumId}/media`,
        {
          method: media ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        {
          success: media ? 'Imagen actualizada correctamente.' : 'Imagen agregada correctamente.',
          fallback: media ? 'No se pudo actualizar la imagen.' : 'No se pudo agregar la imagen.',
          onSuccess: onSaved,
        },
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="gallery-media-form">
      <FileDropInput
        existingImageUrl={media?.src}
        helperText={tGallery('editor.mediaHelperText')}
        label={tGallery('editor.mediaField')}
        errorMessage={hasAttemptedSubmit && missingFile ? tGallery('editor.mediaRequired') : null}
        onFileSelect={setFile}
        required={!isEdit}
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
            {isLegacy && locale === defaultLocale ? (
              <Notice>{tGallery('editor.mediaLegacyBaseText')}</Notice>
            ) : null}

            {isLegacy && locale !== defaultLocale ? (
              <Notice tone="warning">{tGallery('editor.mediaLegacyNoTranslation')}</Notice>
            ) : null}

            <FormField
              error={errors[contentPath(locale, 'title')]}
              id={`${formId}-${locale}-title`}
              label={t('editor.titleField', { language: languageLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => updateContent(locale, 'title', value)}
              required
              value={content[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'description')]}
              id={`${formId}-${locale}-description`}
              label={t('editor.descriptionField', { language: languageLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              multiline
              onChange={(value) => updateContent(locale, 'description', value)}
              required
              value={content[locale].description}
            />
            {reviewControl(locale, 'description')}

            <FormField
              error={errors[contentPath(locale, 'altText')]}
              id={`${formId}-${locale}-alt`}
              label={t('editor.altTextField', { language: languageLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => updateContent(locale, 'altText', value)}
              required
              value={content[locale].altText}
            />
            {reviewControl(locale, 'altText')}
          </>
        )}
      </LanguageTabs>

      <FormField
        id="media-date"
        label={t('editor.date')}
        onChange={setDate}
        required
        type="date"
        value={date}
      />

      <div className="cms-form-grid cms-form-grid-2">
        <FormField
          id={`${formId}-gallery-width`}
          label={tGallery('editor.galleryWidth')}
          onChange={(value) => {
            setColSpan(value as string)
          }}
          options={spanOptions}
          value={colSpan}
        />

        <FormField
          id={`${formId}-gallery-height`}
          label={tGallery('editor.galleryHeight')}
          onChange={(value) => {
            setRowSpan(value as string)
          }}
          options={spanOptions}
          value={rowSpan}
        />
      </div>

      <div className="cms-form-actions">
        <Button onClick={requestCancel} variant="secondary">
          {t('editor.cancel')}
        </Button>
        <Button disabled={isSaving} onClick={handleSubmit} variant="primary">
          {isSaving ? <>{t('editor.uploadingImage')}</> : <>{t('editor.save')}</>}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('discardDialog.message')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onCancel()
        }}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discardDialog.title')}
      />
    </div>
  )
}
