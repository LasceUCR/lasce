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
import { defaultLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
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
  indicatorHasChanges,
  validateIndicatorValue,
  type IndicatorDraft,
  type IndicatorFormInitial,
} from '@/app/lib/home-form'
import {
  INDICATOR_TEXT_MAX,
  indicatorContent,
  type IndicatorField,
  type IndicatorReviewConfirmation,
} from '@/app/lib/home-schema'

import { useHomeEditorLanguage } from './useHomeEditorLanguage'

export interface IndicatorFormHandle {
  /** Closes the form through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface IndicatorFormProps {
  /** What the form opens with, from `indicatorInitial()`. */
  initial: IndicatorFormInitial
  onSave: (draft: IndicatorDraft, confirmed: IndicatorReviewConfirmation[]) => void
  onCancel: () => void
  ref?: Ref<IndicatorFormHandle>
}

/**
 * Edits one geomagnetic index: its value, shared by every language, and its description, written
 * once per language inside `LanguageTabs`. Both are required and at most `INDICATOR_TEXT_MAX`
 * characters. Changing only the value never asks for a translation; changing the description in
 * one language asks to update or confirm the other. Same save and discard behaviour as the
 * banner's editor.
 */
export function IndicatorForm({ initial, onSave, onCancel, ref }: IndicatorFormProps) {
  const formId = useId()
  const t = useTranslations('home')
  const language = useHomeEditorLanguage()
  const { uiLocale } = language
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<IndicatorDraft>(initial.draft)
  const [confirmed, setConfirmed] = useState<IndicatorReviewConfirmation[]>([])
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
    if (indicatorHasChanges(initial, draft)) setDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  const needed = reviewsNeeded(indicatorContent, initial.stored, draft.content)

  function validate(): FormErrors {
    const found = validateContent(
      indicatorContent,
      initial.stored,
      draft.content,
      confirmed,
      uiLocale,
    )
    const valueError = validateIndicatorValue(draft.value, language)
    return valueError ? { value: valueError, ...found } : found
  }

  const errors: FormErrors = attempted ? validate() : {}

  function changeDescription(locale: Locale, field: IndicatorField, value: string) {
    setDraft((current) => ({
      ...current,
      content: { ...current.content, [locale]: { ...current.content[locale], [field]: value } },
    }))
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

  function reviewControl(locale: Locale) {
    const review = needed.find((each) => each.locale === locale && each.field === 'description')
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(indicatorContent, review, uiLocale)}
        message={reviewMessage(indicatorContent, review, initial.stored, draft.content, uiLocale)}
        onChange={(checked) => {
          setConfirmed((current) => withConfirmation(current, review, checked))
        }}
      />
    )
  }

  return (
    <div className="home-editor-form" ref={formRef}>
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
              error={errors[contentPath(locale, 'description')]}
              id={`${formId}-${locale}-description`}
              label={t('editor.descriptionField', { language: localeLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              maxLength={INDICATOR_TEXT_MAX}
              onChange={(value) => changeDescription(locale, 'description', value)}
              placeholder={t('editor.descriptionHint')}
              required
              value={draft.content[locale].description}
            />
            {reviewControl(locale)}
          </>
        )}
      </LanguageTabs>

      {/* Shared by every language, so outside the tabs. */}
      <FormField
        error={errors.value}
        id={`${formId}-value`}
        label={t('editor.valueField')}
        maxLength={INDICATOR_TEXT_MAX}
        onChange={(value) => {
          setDraft((current) => ({ ...current, value }))
        }}
        placeholder={t('editor.valueHint')}
        required
        value={draft.value}
      />

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
