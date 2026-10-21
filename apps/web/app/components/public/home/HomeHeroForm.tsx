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
  type ContentDraft,
  type FormErrors,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import { heroHasChanges, type HeroFormInitial } from '@/app/lib/home-form'
import { heroContent, type HeroField, type HeroReviewConfirmation } from '@/app/lib/home-schema'

import { useHomeEditorLanguage } from './useHomeEditorLanguage'

/** What a parent can ask of the form: the modal around it routes its close button here. */
export interface HomeHeroFormHandle {
  /** Closes the form through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface HomeHeroFormProps {
  /** What the form opens with, from `heroInitial()`. */
  initial: HeroFormInitial
  /** Called once the edit is valid, with the confirmations it still needs. */
  onSave: (draft: ContentDraft<HeroField>, confirmed: HeroReviewConfirmation[]) => void
  /** Called to close the form, once any unsaved changes have been discarded. */
  onCancel: () => void
  ref?: Ref<HomeHeroFormHandle>
}

/**
 * Edits the home page banner's title and subtitle in every language, one tab per language
 * (`LanguageTabs`). Both are required in both languages. When a field changes in one language
 * only, its counterpart must change too or be confirmed with a `TranslationReview` switch, in this
 * edit. Saving asks for no confirmation; closing with unsaved changes does, from "Cancelar" or,
 * through `ref`'s `requestCancel`, from the modal's close button and Escape.
 */
export function HomeHeroForm({ initial, onSave, onCancel, ref }: HomeHeroFormProps) {
  const formId = useId()
  const t = useTranslations('home')
  const { uiLocale } = useHomeEditorLanguage()
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLDivElement>(null)

  const [draft, setDraft] = useState<ContentDraft<HeroField>>(initial.draft)
  const [confirmed, setConfirmed] = useState<HeroReviewConfirmation[]>([])
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
    if (heroHasChanges(initial, draft)) setDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  const needed = reviewsNeeded(heroContent, initial.stored, draft)
  const validate = () => validateContent(heroContent, initial.stored, draft, confirmed, uiLocale)
  const errors: FormErrors = attempted ? validate() : {}

  function change(locale: Locale, field: HeroField, value: string) {
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

  function reviewControl(locale: Locale, field: HeroField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(heroContent, review, uiLocale)}
        message={reviewMessage(heroContent, review, initial.stored, draft, uiLocale)}
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
              error={errors[contentPath(locale, 'title')]}
              id={`${formId}-${locale}-title`}
              label={t('editor.heroTitleField', { language: localeLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              maxLength={heroContent.specs.title.maxLength}
              onChange={(value) => change(locale, 'title', value)}
              required
              value={draft[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'lead')]}
              id={`${formId}-${locale}-lead`}
              label={t('editor.heroLeadField', { language: localeLabels[locale] })}
              lang={contentFieldLang(initial.stored, locale)}
              maxLength={heroContent.specs.lead.maxLength}
              multiline
              onChange={(value) => change(locale, 'lead', value)}
              required
              value={draft[locale].lead}
            />
            {reviewControl(locale, 'lead')}
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
