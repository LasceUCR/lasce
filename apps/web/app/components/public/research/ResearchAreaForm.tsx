'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'

import {
  uploadResearchAreaImage,
  type UploadResearchAreaImageResult,
} from '@/app/(public)/investigacion/actions'
import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { useToast } from '@/app/components/public/toast/ToastProvider'
import { defaultLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  contentPath,
  errorSummary,
  isConfirmed,
  languageTabFlags,
  resetConfirmations,
  tabWithErrors,
  withConfirmation,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import {
  hasUnsavedText,
  reviewsNeededFor,
  validateDraft,
  type ResearchAreaDraft,
  type ResearchAreaFormInitial,
} from '@/app/lib/research-area-form'
import {
  researchAreaContent,
  type ResearchAreaField,
  type ResearchAreaReviewConfirmation,
} from '@/app/lib/research-area-schema'

import { useResearchAreaEditorLanguage } from './useResearchAreaEditorLanguage'

/** Stands in for a photo chosen but not uploaded yet, so validation sees one is there. */
const PENDING_UPLOAD = 'pending-upload'

/** What a parent can ask of the form: the modal around it routes its close button here. */
export interface ResearchAreaFormHandle {
  /** Closes the form through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface ResearchAreaFormResult {
  draft: ResearchAreaDraft
  /** The confirmations this edit still needs. */
  confirmed: ResearchAreaReviewConfirmation[]
  /** The photograph's permanent address, already uploaded. */
  src: string
}

export interface ResearchAreaFormProps {
  /** What the form opens with: from `emptyInitial()` or `initialFromArea()`. */
  initial: ResearchAreaFormInitial
  /** Called once the edit is valid and any new photo is uploaded. */
  onSave: (result: ResearchAreaFormResult) => void | Promise<void>
  /** Called to close the form, once any unsaved changes have been discarded. */
  onCancel: () => void
  ref?: Ref<ResearchAreaFormHandle>
}

/**
 * Creates or edits a research area in both languages. The title and description sit in one tab
 * per language (`LanguageTabs`), both required in each; the photograph sits below, outside the
 * tabs, because it is the same in every language. Both panels stay mounted, so switching tabs
 * never loses what was typed, and the tabs never change the site's language.
 *
 * When a field changes in one language only, its counterpart must change too or be confirmed
 * with a `TranslationReview` switch, in this edit. An area saved before languages existed opens
 * with its base text on the Spanish tab and an empty English tab; its photo can be changed
 * without translating it.
 *
 * Saving asks for no confirmation; closing with unsaved changes does, from "Cancelar" or, through
 * `ref`'s `requestCancel`, from the modal's own close button and Escape. A photo that fails to
 * upload is reported in an error toast, and the form stays open.
 */
export function ResearchAreaForm({ initial, onSave, onCancel, ref }: ResearchAreaFormProps) {
  const formId = useId()
  const t = useTranslations('researchAreas')
  const language = useResearchAreaEditorLanguage()
  const { uiLocale } = language
  const toast = useToast()
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<ResearchAreaDraft>(initial.draft)
  const [confirmed, setConfirmed] = useState<ResearchAreaReviewConfirmation[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [focusRequest, setFocusRequest] = useState(0)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  /** The photo as validation sees it: a new file counts as present before it is uploaded. */
  const currentSrc = photoFile ? PENDING_UPLOAD : photoRemoved ? '' : initial.src

  function requestCancel() {
    if (hasUnsavedText(initial, draft) || photoFile !== null || photoRemoved) setDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  const needed = reviewsNeededFor(initial, draft)
  const errors = attempted ? validateDraft(initial, draft, confirmed, currentSrc, language) : {}
  const summary = attempted ? errorSummary(errors, tab, uiLocale) : null

  function change(locale: Locale, field: ResearchAreaField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    // Changing a field in any language invalidates its confirmations.
    setConfirmed((current) => resetConfirmations(current, field))
  }

  async function handleSave() {
    setAttempted(true)
    const found = validateDraft(initial, draft, confirmed, currentSrc, language)

    if (Object.keys(found).length > 0) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((current) => current + 1)
      return
    }

    let src = currentSrc
    if (photoFile) {
      setIsUploading(true)
      let result: UploadResearchAreaImageResult
      try {
        const formData = new FormData()
        formData.set('file', photoFile)
        result = await uploadResearchAreaImage(formData)
      } catch {
        result = { ok: false, error: t('editor.uploadFailed') }
      }
      setIsUploading(false)

      if (!result.ok) {
        toast.show('error', result.error)
        return
      }
      src = result.imageUrl
    }

    await onSave({ draft, confirmed: confirmationsStillNeeded(confirmed, needed), src })
  }

  function reviewControl(locale: Locale, field: ResearchAreaField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(researchAreaContent, review, uiLocale)}
        message={reviewMessage(researchAreaContent, review, initial.stored, draft, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  return (
    <div className="research-area-form" ref={formRef}>
      <LanguageTabs
        copyLang={uiLocale}
        flags={languageTabFlags(initial.stored, errors, needed, confirmed, uiLocale)}
        label={t('editor.languageTabs')}
        onSelect={setTab}
        selected={tab}
        tablistContainer={headerSlot}
      >
        {(locale) => (
          <>
            {initial.isLegacy && initial.stored ? (
              <Notice tone={locale === defaultLocale ? 'info' : 'warning'}>
                {locale === defaultLocale
                  ? t('editor.legacyBaseText')
                  : t('editor.legacyNoTranslation')}
              </Notice>
            ) : null}

            <FormField
              error={errors[contentPath(locale, 'title')]}
              id={`${formId}-${locale}-title`}
              label={t('editor.titleField', { language: localeLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              onChange={(value) => change(locale, 'title', value)}
              required
              value={draft[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'description')]}
              id={`${formId}-${locale}-description`}
              label={t('editor.descriptionField', { language: localeLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              multiline
              onChange={(value) => change(locale, 'description', value)}
              required
              value={draft[locale].description}
            />
            {reviewControl(locale, 'description')}
          </>
        )}
      </LanguageTabs>

      {/* Shared by every language, so outside the tabs. */}
      <FileDropInput
        errorMessage={errors.src}
        existingImageUrl={initial.src || undefined}
        helperText={t('editor.photoHelp')}
        label={t('editor.photo')}
        onFileSelect={(file) => {
          setPhotoFile(file)
          setPhotoRemoved(file === null)
        }}
        required
      />

      {summary ? (
        <Notice role="alert" tone="error">
          {summary}
        </Notice>
      ) : null}

      <div className="cms-form-actions">
        <Button onClick={requestCancel} variant="secondary">
          {t('editor.cancel')}
        </Button>

        <Button disabled={isUploading} onClick={handleSave} variant="primary">
          {isUploading ? t('editor.uploading') : t('editor.save')}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel={t('discardDialog.keepEditing')}
        confirmLabel={t('discardDialog.discard')}
        message={t('discardDialog.message')}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false)
          onCancel()
        }}
        open={discardOpen}
        severity="warning"
        title={t('discardDialog.title')}
      />
    </div>
  )
}
