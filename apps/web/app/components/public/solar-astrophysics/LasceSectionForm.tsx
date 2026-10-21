'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'

import { Button } from '@/app/components/public/Button'
import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { defaultLocale, localeLabels, locales, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  isConfirmed,
  languageTabFlags,
  tabWithErrors,
  withConfirmation,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import {
  contentPath,
  hasUnsavedChanges,
  resetConfirmations,
  reviewsNeeded,
  validateDraft,
  type FormErrors,
  type SectionDraft,
  type SectionFormInitial,
} from '@/app/lib/solar-physics-section-form'
import {
  solarPhysicsSectionContent,
  type SolarPhysicsSectionField,
  type SolarPhysicsSectionReviewConfirmation as ReviewConfirmation,
} from '@/app/lib/solar-physics-section-schema'

import { useSolarPhysicsEditorLanguage } from './useSolarPhysicsEditorLanguage'

/** What a parent can ask of the form: the modal around it routes its close button here. */
export interface LasceSectionFormHandle {
  /** Closes the form through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface LasceSectionFormProps {
  /** What the form opens with: from `initialFromSection()`. */
  initial: SectionFormInitial
  /** Called once the edit is valid, with the confirmations it still needs. */
  onSave: (draft: SectionDraft, confirmed: ReviewConfirmation[]) => void
  /** Called to close the form, once any unsaved changes have been discarded. */
  onCancel: () => void
  /**
   * Errors the server returned for the last save, keyed by field path (`content.en.title`).
   * Each one stays until its field changes.
   */
  serverErrors?: FormErrors
  ref?: Ref<LasceSectionFormHandle>
}

/**
 * Edits the title and text of the LASCE section in both languages. Both fields sit in one tab
 * per language (`LanguageTabs`); both panels stay mounted, so switching tabs never loses what was
 * typed. The tabs only choose the translation being edited; they never change the site's
 * language.
 *
 * When a field changes in one language only, the same field in the other language must change
 * too or be confirmed with a switch, in this edit. A legacy section (saved before languages
 * existed) opens with its base text on the Spanish tab, flagged as possibly not Spanish, and an
 * empty English tab.
 *
 * Saving asks for no confirmation; closing with unsaved changes does, from "Cancelar" or,
 * through `ref`'s `requestCancel`, from the modal's own close button and Escape.
 */
export function LasceSectionForm({
  initial,
  onSave,
  onCancel,
  serverErrors,
  ref,
}: LasceSectionFormProps) {
  const formId = useId()
  const t = useTranslations('solarPhysics')
  const language = useSolarPhysicsEditorLanguage()
  const { uiLocale } = language
  // In a modal, the language tabs sit beside its title and stay in view while the form scrolls.
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<SectionDraft>(initial.draft)
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

  function setContent(locale: Locale, field: SolarPhysicsSectionField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    setConfirmed((current) => resetConfirmations(current, field))
    clearServerErrors(locales.map((each) => contentPath(each, field)))
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

  function reviewControl(locale: Locale, field: SolarPhysicsSectionField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(solarPhysicsSectionContent, review, uiLocale)}
        message={reviewMessage(solarPhysicsSectionContent, review, initial.stored, draft, uiLocale)}
        onChange={(checked) => setConfirmation(review, checked)}
      />
    )
  }

  return (
    <div className="lasce-section-form" ref={formRef}>
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
              label={t('editor.titleField', { language: localeLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              onChange={(value) => setContent(locale, 'title', value)}
              required
              value={draft[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'body')]}
              id={`${formId}-${locale}-body`}
              label={t('editor.bodyField', { language: localeLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              multiline
              onChange={(value) => setContent(locale, 'body', value)}
              required
              value={draft[locale].body}
            />
            <p className="form-field-hint">{t('editor.bodyHint')}</p>
            {reviewControl(locale, 'body')}
          </>
        )}
      </LanguageTabs>

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
