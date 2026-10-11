'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'

import { Button } from '@/app/components/public/Button'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { defaultLocale, locales, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  errorSummary,
  isConfirmed,
  languageTabFlags,
  tabWithErrors,
  withConfirmation,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import {
  contentPath,
  hasUnsavedChanges,
  languageLabels,
  resetConfirmations,
  reviewsNeeded,
  validateDraft,
  type FormErrors,
  type PublicationDraft,
  type PublicationFormInitial,
} from '@/app/lib/publication-form'
import {
  publicationContent,
  type ResearchGroup,
  type ReviewConfirmation,
  type TranslatableField,
} from '@/app/lib/publication-schema'

import { PublicationAuthorsField } from './PublicationAuthorsField'
import { usePublicationEditorLanguage } from './usePublicationEditorLanguage'

const researchGroupOptions: FormFieldOption[] = [
  { value: 'LASCE', label: 'LASCE' },
  { value: 'ROSAC', label: 'ROSAC' },
]

type SharedTextField = 'venue' | 'date' | 'href' | 'DOI'

/** What a parent can ask of the form: the modal around it routes its close button here. */
export interface PublicationFormHandle {
  /** Closes the form through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface PublicationFormProps {
  /** What the form opens with: from `emptyInitial()` or `initialFromPublication()`. */
  initial: PublicationFormInitial
  /** Called once the edit is valid, with the confirmations it still needs. */
  onSave: (draft: PublicationDraft, confirmed: ReviewConfirmation[]) => void
  /** Called to close the form, once any unsaved changes have been discarded. */
  onCancel: () => void
  /**
   * Errors the server returned for the last save, keyed by field path (`content.en.title`).
   * Each one stays until its field changes.
   */
  serverErrors?: FormErrors
  ref?: Ref<PublicationFormHandle>
}

/**
 * Creates or edits a publication in both languages. Titles and abstracts sit in one tab per
 * language (`LanguageTabs`: WAI-ARIA tabs with arrow keys, Home and End); the shared fields sit
 * below, outside the tabs. Both panels stay mounted, so switching tabs never loses what was typed.
 * The tabs only choose the translation being edited; they never change the site's language.
 *
 * When a title or abstract changes in one language only, the same field in the other language
 * must change too or be confirmed with a switch, in this edit: a confirmation is dropped as
 * soon as either language of that field changes again. A tab with problems says so in its
 * label, and trying to save opens the first tab that has one.
 *
 * A legacy record (saved before languages existed) opens with its base text on the Spanish tab,
 * flagged as possibly not Spanish, and an empty English tab: nothing is copied across to look
 * like a translation. Its shared fields can be saved without translating it.
 *
 * Saving asks for no confirmation; closing with unsaved changes does, from "Cancelar" or, through
 * `ref`'s `requestCancel`, from the modal's own close button and Escape.
 */
export function PublicationForm({
  initial,
  onSave,
  onCancel,
  serverErrors,
  ref,
}: PublicationFormProps) {
  const formId = useId()
  // Everything the editor says follows the site's language; the tabs only pick the translation.
  const t = useTranslations('publications')
  const language = usePublicationEditorLanguage()
  const { uiLocale } = language
  // In a modal, the language tabs sit beside its title and stay in view while the form scrolls.
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<PublicationDraft>(initial.draft)
  const [confirmed, setConfirmed] = useState<ReviewConfirmation[]>([])
  const [attempted, setAttempted] = useState(false)
  const [tab, setTab] = useState<Locale>(
    () => tabWithErrors(serverErrors ?? {}, defaultLocale) ?? defaultLocale,
  )
  const [focusRequest, setFocusRequest] = useState(0)
  const [discardOpen, setDiscardOpen] = useState(false)

  // New server errors replace the previous ones and open the tab they point at. Adjusted while
  // rendering rather than in an effect, so the errors and the tab change in the same render.
  const [server, setServer] = useState({ source: serverErrors, errors: serverErrors ?? {} })
  if (serverErrors !== server.source) {
    const errors = serverErrors ?? {}
    setServer({ source: serverErrors, errors })
    const target = tabWithErrors(errors, tab)
    if (target) setTab(target)
  }

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  function requestCancel() {
    if (hasUnsavedChanges(initial, draft)) setDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  const needed = reviewsNeeded(initial, draft)
  const errors: FormErrors = {
    ...server.errors,
    ...(attempted ? validateDraft(initial, draft, confirmed, language) : {}),
  }

  function clearServerErrors(paths: string[]) {
    if (!paths.some((path) => path in server.errors)) return
    setServer((current) => ({
      ...current,
      errors: Object.fromEntries(
        Object.entries(current.errors).filter(([path]) => !paths.includes(path)),
      ),
    }))
  }

  function setContent(locale: Locale, field: TranslatableField, value: string) {
    setDraft((current) => ({
      ...current,
      content: { ...current.content, [locale]: { ...current.content[locale], [field]: value } },
    }))
    setConfirmed((current) => resetConfirmations(current, field))
    clearServerErrors(locales.map((each) => contentPath(each, field)))
  }

  function setShared(field: SharedTextField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
    clearServerErrors([field])
  }

  function setAuthors(authors: string[]) {
    setDraft((current) => ({ ...current, authors }))
    clearServerErrors(['authors'])
  }

  function setConfirmation(review: ReviewConfirmation, checked: boolean) {
    setConfirmed((current) => withConfirmation(current, review, checked))
    clearServerErrors([contentPath(review.locale, review.field)])
  }

  function handleSave() {
    setAttempted(true)
    const found = validateDraft(initial, draft, confirmed, language)

    if (Object.keys(found).length === 0) {
      onSave(draft, confirmationsStillNeeded(confirmed, needed))
      return
    }

    const target = tabWithErrors(found, tab)
    if (target) setTab(target)
    setFocusRequest((current) => current + 1)
  }

  function reviewControl(locale: Locale, field: TranslatableField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(publicationContent, review, uiLocale)}
        message={reviewMessage(publicationContent, review, initial.stored, draft.content, uiLocale)}
        onChange={(checked) => setConfirmation(review, checked)}
      />
    )
  }

  const summary = errorSummary(errors, tab, uiLocale)

  return (
    <div className="publication-form" ref={formRef}>
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
            {initial.isLegacy && locale === defaultLocale ? (
              <Notice>{t('editor.legacyBaseText')}</Notice>
            ) : null}

            {initial.isLegacy && locale !== defaultLocale ? (
              <Notice tone="warning">{t('editor.legacyNoTranslation')}</Notice>
            ) : null}

            <FormField
              error={errors[contentPath(locale, 'title')]}
              id={`${formId}-${locale}-title`}
              label={t('editor.titleField', { language: languageLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              onChange={(value) => setContent(locale, 'title', value)}
              required
              value={draft.content[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'abstract')]}
              id={`${formId}-${locale}-abstract`}
              label={t('editor.abstractField', { language: languageLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              multiline
              onChange={(value) => setContent(locale, 'abstract', value)}
              required
              value={draft.content[locale].abstract}
            />
            {reviewControl(locale, 'abstract')}
          </>
        )}
      </LanguageTabs>

      {/* Metadata: date, DOI and group in one row; link and journal in the next. */}
      <div className="cms-form-grid cms-form-grid-3">
        <FormField
          error={errors.date}
          id={`${formId}-date`}
          label={t('editor.date')}
          onChange={(value) => setShared('date', value)}
          required
          type="date"
          value={draft.date}
        />

        <FormField
          error={errors.DOI}
          id={`${formId}-doi`}
          label={t('editor.doi')}
          onChange={(value) => setShared('DOI', value)}
          placeholder={t('editor.doiPlaceholder')}
          validate={(value) => {
            const result = language.fieldSchemas.doi.safeParse(value)
            if (!result.success) throw new Error(result.error.issues[0]?.message)
          }}
          value={draft.DOI}
        />

        <FormField
          error={errors.researchGroup}
          id={`${formId}-research-group`}
          label={t('editor.group')}
          onChange={(value) => {
            setDraft((current) => ({ ...current, researchGroup: value as ResearchGroup }))
            clearServerErrors(['researchGroup'])
          }}
          options={researchGroupOptions}
          value={draft.researchGroup}
        />
      </div>

      <div className="cms-form-grid cms-form-grid-2">
        <FormField
          error={errors.href}
          id={`${formId}-href`}
          label={t('editor.href')}
          onChange={(value) => setShared('href', value)}
          type="url"
          validate={(value) => {
            const result = language.fieldSchemas.externalUrl.safeParse(value)
            if (!result.success) throw new Error(result.error.issues[0]?.message)
          }}
          value={draft.href}
        />

        <FormField
          error={errors.venue}
          id={`${formId}-venue`}
          label={t('editor.venue')}
          onChange={(value) => setShared('venue', value)}
          required
          value={draft.venue}
        />
      </div>

      <PublicationAuthorsField
        authors={draft.authors}
        error={errors.authors}
        onChange={setAuthors}
        required
      />

      {summary ? (
        <Notice role="alert" tone="error">
          {summary}
        </Notice>
      ) : null}

      <div className="nosotros-activity-form-actions publication-form-actions">
        <Button onClick={requestCancel} variant="secondary">
          {t('editor.cancel')}
        </Button>
        <Button onClick={handleSave} variant="primary">
          {t('editor.save')}
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
