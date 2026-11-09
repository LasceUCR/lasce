'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'

import { uploadAcademicActivityImage } from '@/app/(public)/actividades-academicas/actions'
import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import {
  hasUnsavedChanges,
  reviewsNeeded,
  validateDraft,
  type AcademicActivityDraft,
  type AcademicActivityFormInitial,
  type FormErrors,
} from '@/app/lib/academic-activities-form'
import {
  academicActivityContent,
  type AcademicActivityField,
  type ReviewConfirmation,
} from '@/app/lib/academic-activities-schema'
import { defaultLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  contentPath,
  isConfirmed,
  languageTabFlags,
  resetConfirmations,
  tabWithErrors,
  withConfirmation,
} from '@/app/lib/i18n/content/form'
import { resolveLocale } from '@/app/lib/i18n/locale'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'

/** What a parent can ask of the form: the modal around it routes its close button here. */
export interface AcademicActivityFormHandle {
  /** Closes the form through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface AcademicActivityFormProps {
  /** What the form opens with: from `emptyInitial()` or `initialFromActivity()`. */
  initial: AcademicActivityFormInitial
  /**
   * Called once the edit is valid: the confirmations it still needs, and the photo's new public
   * URL when a file was uploaded during this save, or `null` when the photo was not touched.
   */
  onSave: (
    draft: AcademicActivityDraft,
    confirmed: ReviewConfirmation[],
    newPhotoUrl: string | null,
  ) => void
  /** Called to close the form, once any unsaved changes have been discarded. */
  onCancel: () => void
  /** True while a save is in flight: the fields and buttons are disabled. */
  busy?: boolean
  ref?: Ref<AcademicActivityFormHandle>
}

/**
 * Creates or edits an academic activity in both languages. The title, category, description and
 * the photo's alt text sit in one tab per language (`LanguageTabs`); the dates, the location and
 * the photo itself are shared and sit below, outside the tabs. Both panels stay mounted, so
 * switching tabs never loses what was typed.
 *
 * Closing with unsaved changes asks first, from "Cancelar" or, through `ref`'s `requestCancel`,
 * from the modal's own close button and Escape.
 */
export function AcademicActivityForm({
  initial,
  onSave,
  onCancel,
  busy = false,
  ref,
}: AcademicActivityFormProps) {
  const formId = useId()
  const t = useTranslations('academicActivities.editor')
  const validation = useTranslations('academicActivities.validation')
  const discardT = useTranslations('academicActivities.discardDialog')
  const fieldMessages = {
    startDate: validation('startDate'),
    endDate: validation('endDate'),
    location: validation('location'),
    photo: validation('photo'),
    uploadFailed: validation('uploadFailed'),
  }
  const uiLocale = resolveLocale(useLocale())
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLFormElement>(null)

  const [draft, setDraft] = useState<AcademicActivityDraft>(initial.draft)
  const [confirmed, setConfirmed] = useState<ReviewConfirmation[]>([])
  const [attempted, setAttempted] = useState(false)
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [focusRequest, setFocusRequest] = useState(0)
  const [discardOpen, setDiscardOpen] = useState(false)

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const hasPhoto = photoFile !== null || (Boolean(initial.photoUrl) && !photoRemoved)
  const photoChanged = photoFile !== null || photoRemoved

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  function requestCancel() {
    if (busy) return
    if (hasUnsavedChanges(initial, draft, photoChanged)) setDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  const needed = reviewsNeeded(initial, draft)
  const errors: FormErrors = attempted
    ? validateDraft(initial, draft, confirmed, hasPhoto, uiLocale, fieldMessages)
    : {}

  function setContent(locale: Locale, field: AcademicActivityField, value: string) {
    setDraft((current) => ({
      ...current,
      content: { ...current.content, [locale]: { ...current.content[locale], [field]: value } },
    }))
    setConfirmed((current) => resetConfirmations(current, field))
  }

  function reviewControl(locale: Locale, field: AcademicActivityField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(academicActivityContent, review, uiLocale)}
        message={reviewMessage(
          academicActivityContent,
          review,
          initial.stored,
          draft.content,
          uiLocale,
        )}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  async function handleSave() {
    if (busy) return
    setAttempted(true)
    const found = validateDraft(initial, draft, confirmed, hasPhoto, uiLocale, fieldMessages)

    if (Object.keys(found).length > 0) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((current) => current + 1)
      return
    }

    if (isUploading) return

    let newPhotoUrl: string | null = null
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
        newPhotoUrl = result.imageUrl
      } catch {
        setIsUploading(false)
        setUploadError(validation('uploadFailed'))
        return
      }
      setIsUploading(false)
    }

    onSave(draft, confirmationsStillNeeded(confirmed, needed), newPhotoUrl)
  }

  const photoUrlShown = !photoRemoved && initial.photoUrl ? initial.photoUrl : undefined

  return (
    <form
      className="news-article-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
      ref={formRef}
    >
      <fieldset className="news-article-form-fields" disabled={busy}>
        {uploadError ? (
          <p className="form-alert" role="alert">
            {uploadError}
          </p>
        ) : null}

        <LanguageTabs
          copyLang={uiLocale}
          flags={languageTabFlags(initial.stored, errors, needed, confirmed, uiLocale)}
          label={t('languageTabs')}
          onSelect={setTab}
          selected={tab}
          tablistContainer={headerSlot}
        >
          {(locale) => (
            <>
              {initial.isLegacy && locale === defaultLocale ? (
                <Notice>{t('legacyBaseText')}</Notice>
              ) : null}

              {initial.isLegacy && locale !== defaultLocale ? (
                <Notice tone="warning">{t('legacyNoTranslation')}</Notice>
              ) : null}

              <FormField
                error={errors[contentPath(locale, 'title')]}
                id={`${formId}-${locale}-title`}
                label={t('titleField', { language: localeLabels[locale] })}
                lang={contentFieldLang(initial.stored, locale)}
                onChange={(value) => setContent(locale, 'title', value)}
                required
                value={draft.content[locale].title}
              />
              {reviewControl(locale, 'title')}

              <FormField
                error={errors[contentPath(locale, 'category')]}
                id={`${formId}-${locale}-category`}
                label={t('categoryField', { language: localeLabels[locale] })}
                lang={contentFieldLang(initial.stored, locale)}
                onChange={(value) => setContent(locale, 'category', value)}
                placeholder={t('categoryPlaceholder')}
                required
                value={draft.content[locale].category}
              />
              {reviewControl(locale, 'category')}

              <FormField
                error={errors[contentPath(locale, 'description')]}
                id={`${formId}-${locale}-description`}
                label={t('descriptionField', { language: localeLabels[locale] })}
                lang={contentFieldLang(initial.stored, locale)}
                multiline
                onChange={(value) => setContent(locale, 'description', value)}
                required
                value={draft.content[locale].description}
              />
              {reviewControl(locale, 'description')}

              <FormField
                error={errors[contentPath(locale, 'photoAlt')]}
                id={`${formId}-${locale}-photo-alt`}
                label={t('photoAltField', { language: localeLabels[locale] })}
                lang={contentFieldLang(initial.stored, locale)}
                onChange={(value) => setContent(locale, 'photoAlt', value)}
                required
                value={draft.content[locale].photoAlt}
              />
              {reviewControl(locale, 'photoAlt')}
            </>
          )}
        </LanguageTabs>

        <div className="news-article-form-row">
          <FormField
            error={errors.startDate}
            id={`${formId}-start-date`}
            label={t('startDateField')}
            onChange={(value) => setDraft((current) => ({ ...current, startDate: value }))}
            required
            type="date"
            value={draft.startDate}
          />
          <FormField
            error={errors.endDate}
            id={`${formId}-end-date`}
            label={t('endDateField')}
            onChange={(value) => setDraft((current) => ({ ...current, endDate: value }))}
            type="date"
            value={draft.endDate}
          />
        </div>

        <FormField
          error={errors.location}
          id={`${formId}-location`}
          label={t('locationField')}
          onChange={(value) => setDraft((current) => ({ ...current, location: value }))}
          required
          value={draft.location}
        />

        <FileDropInput
          errorMessage={errors.photo}
          existingImageUrl={photoUrlShown}
          helperText={t('photoHelperText')}
          label={t('photoField')}
          onFileSelect={(file) => {
            setPhotoFile(file)
            setPhotoRemoved(file === null)
          }}
          required
        />

        <div className="cms-form-actions">
          <Button onClick={requestCancel} variant="secondary">
            {t('cancel')}
          </Button>
          <Button disabled={isUploading} type="submit" variant="primary">
            {isUploading ? t('uploadingImage') : busy ? t('saving') : t('save')}
          </Button>
        </div>
      </fieldset>

      <StandardConfirmDialog
        cancelLabel={discardT('keepEditing')}
        confirmLabel={discardT('discard')}
        message={discardT('message')}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false)
          onCancel()
        }}
        open={discardOpen}
        severity="warning"
        title={discardT('title')}
      />
    </form>
  )
}
