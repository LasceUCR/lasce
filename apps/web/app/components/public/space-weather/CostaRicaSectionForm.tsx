'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'

import { Button } from '@/app/components/public/Button'
import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { defaultLocale, isLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  contentPath,
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
import {
  sectionHasChanges,
  type SpaceWeatherSectionDraft,
  type SpaceWeatherSectionFormInitial,
} from '@/app/lib/space-weather-section-form'
import {
  spaceWeatherSectionContent,
  type SpaceWeatherSectionField,
  type SpaceWeatherSectionReviewConfirmation,
} from '@/app/lib/space-weather-section-schema'

/** What a parent can ask of the form: the modal around it routes its close button here. */
export interface CostaRicaSectionFormHandle {
  /** Closes the form through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface CostaRicaSectionFormProps {
  /** What the form opens with, from `sectionInitial()`. */
  initial: SpaceWeatherSectionFormInitial
  /** Called once the edit is valid, with the confirmations it still needs. */
  onSave: (
    draft: SpaceWeatherSectionDraft,
    confirmed: SpaceWeatherSectionReviewConfirmation[],
  ) => void
  /** Called to close the form, once any unsaved changes have been discarded. */
  onCancel: () => void
  ref?: Ref<CostaRicaSectionFormHandle>
}

/**
 * Edits the "¿Por qué estudiarlo desde Costa Rica?" card's title and text in every language, one
 * tab per language (`LanguageTabs`). Both are required in both languages; a blank line in the
 * text starts a new paragraph. When a field changes in one language only, its counterpart must
 * change too or be confirmed with a `TranslationReview` switch, in this edit.
 *
 * Like the other bilingual editors, the form is checked when "Confirmar" is pressed, with the
 * API's own rules: each problem shows under its field and on its language tab, the form switches
 * to the tab that has one (so a change made in one language leads to the other) and focuses the
 * first field to fix. From then on the errors follow the editing. Saving asks for no
 * confirmation; closing with unsaved changes does, from "Cancelar" or, through `ref`'s
 * `requestCancel`, from the modal's close button and Escape.
 */
export function CostaRicaSectionForm({
  initial,
  onSave,
  onCancel,
  ref,
}: CostaRicaSectionFormProps) {
  const formId = useId()
  const t = useTranslations('spaceWeather')
  const siteLocale = useLocale()
  const uiLocale: Locale = isLocale(siteLocale) ? siteLocale : defaultLocale
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<SpaceWeatherSectionDraft>(initial.draft)
  const [confirmed, setConfirmed] = useState<SpaceWeatherSectionReviewConfirmation[]>([])
  const [attempted, setAttempted] = useState(false)
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [focusRequest, setFocusRequest] = useState(0)
  const [discardOpen, setDiscardOpen] = useState(false)

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  function requestCancel() {
    if (sectionHasChanges(initial, draft)) setDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  const content = spaceWeatherSectionContent
  const needed = reviewsNeeded(content, initial.stored, draft)
  const validate = () => validateContent(content, initial.stored, draft, confirmed, uiLocale)
  const errors: FormErrors = attempted ? validate() : {}

  function change(locale: Locale, field: SpaceWeatherSectionField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    // Changing a field in any language invalidates its confirmations.
    setConfirmed((current) => resetConfirmations(current, field))
  }

  function handleSave() {
    setAttempted(true)
    const found = validate()

    if (Object.keys(found).length === 0) {
      onSave(draft, confirmationsStillNeeded(confirmed, needed))
      return
    }

    const target = tabWithErrors(found, tab)
    if (target) setTab(target)
    setFocusRequest((current) => current + 1)
  }

  function reviewControl(locale: Locale, field: SpaceWeatherSectionField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(content, review, uiLocale)}
        message={reviewMessage(content, review, initial.stored, draft, uiLocale)}
        onChange={(checked) => {
          setConfirmed((current) => withConfirmation(current, review, checked))
        }}
      />
    )
  }

  return (
    <div className="space-weather-editor-form" ref={formRef}>
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
            {initial.isLegacy ? (
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
              maxLength={content.specs.title.maxLength}
              onChange={(value) => change(locale, 'title', value)}
              required
              value={draft[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'body')]}
              id={`${formId}-${locale}-body`}
              label={t('editor.bodyField', { language: localeLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              maxLength={content.specs.body.maxLength}
              multiline
              onChange={(value) => change(locale, 'body', value)}
              required
              value={draft[locale].body}
            />
            <p className="form-field-hint">{t('editor.bodyHint')}</p>
            {reviewControl(locale, 'body')}
          </>
        )}
      </LanguageTabs>

      <div className="nosotros-activity-form-actions">
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
