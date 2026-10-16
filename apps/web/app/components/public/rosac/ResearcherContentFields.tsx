'use client'

import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
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
  nosotrosResearcherContent,
  type NosotrosResearcherContentInput,
  type NosotrosResearcherEditingData,
  type NosotrosResearcherField,
} from '@/app/lib/nosotros-researcher-schema'

/** What the form sends for the translatable fields once they are valid. */
export interface ResearcherContentResult {
  /**
   * Both languages in full, or `null` when no translatable text changed, so the shared fields of
   * a legacy researcher can be saved without translating it.
   */
  content: NosotrosResearcherContentInput | null
  /** The one-sided changes the editor reviewed and kept, only meaningful with `content`. */
  confirmedUnchanged: ReviewConfirmation<NosotrosResearcherField>[]
}

/**
 * What `ResearcherForm` asks of the fields, in event handlers only: the draft lives here, so the
 * form (which also serves the single-language ROSAC editor and so cannot read the site's
 * language itself) never needs to know about tabs, drafts or reviews.
 */
export interface ResearcherContentHandle {
  /**
   * Shows the errors of the translatable fields, opens the tab that has one and, unless `focus`
   * is false, focuses the first invalid field. Returns whether they are valid.
   */
  validate: (options?: { focus?: boolean }) => boolean
  /** True when there is unsaved text: any change while editing, anything typed while creating. */
  isDirty: () => boolean
  result: () => ResearcherContentResult
}

export interface ResearcherContentFieldsProps {
  /**
   * `editing` of the researcher being edited: its text in both languages and the version to save
   * against. `null` when creating one.
   */
  editing: NosotrosResearcherEditingData | null
  ref?: Ref<ResearcherContentHandle>
}

/**
 * The role and the description of a Nosotros researcher, in one tab per language
 * (`LanguageTabs`). Both panels stay mounted, so switching tabs never loses what was typed, and
 * the tabs never change the site's language. The role is required in both languages; the
 * description is all-or-none: empty in both, or filled in both.
 *
 * When a field changes in one language only, the same field in the other language must change
 * too or be confirmed with a switch, in this edit. A legacy researcher (saved before languages
 * existed) opens with its base text on the Spanish tab, flagged as possibly not Spanish, and an
 * empty English tab: nothing is copied across to look like a translation.
 */
export function ResearcherContentFields({ editing, ref }: ResearcherContentFieldsProps) {
  const t = useTranslations('nosotros.researchers.form')
  const siteLocale = useLocale()
  // Everything the editor says follows the site's language; the tabs only pick the translation.
  const uiLocale: Locale = isLocale(siteLocale) ? siteLocale : defaultLocale
  const stored = editing?.content ?? null
  const headerSlot = useModalHeaderSlot()
  const containerRef = useRef<HTMLDivElement>(null)
  const formId = useId()

  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [draft, setDraft] = useState<ContentDraft<NosotrosResearcherField>>(() =>
    draftFromStored(nosotrosResearcherContent, stored),
  )
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<NosotrosResearcherField>[]>([])
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid =
      containerRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  const needed = reviewsNeeded(nosotrosResearcherContent, stored, draft)
  const errors = attempted
    ? validateContent(nosotrosResearcherContent, stored, draft, confirmed, uiLocale)
    : {}

  const contentChanged = hasContentChanges(nosotrosResearcherContent, stored, draft)

  useImperativeHandle(ref, () => ({
    validate({ focus = true } = {}) {
      setAttempted(true)
      const found = validateContent(nosotrosResearcherContent, stored, draft, confirmed, uiLocale)
      if (Object.keys(found).length === 0) return true

      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      if (focus) setFocusRequest((current) => current + 1)
      return false
    },
    isDirty() {
      // Creating starts from nothing, so only typed text counts as unsaved.
      if (editing) return contentChanged
      return Object.values(draft).some((text) =>
        Object.values(text).some((value) => value.trim() !== ''),
      )
    },
    result() {
      return {
        content: contentChanged ? toContentInput(nosotrosResearcherContent, draft) : null,
        confirmedUnchanged: contentChanged ? confirmationsStillNeeded(confirmed, needed) : [],
      }
    },
  }))

  function setContent(locale: Locale, field: NosotrosResearcherField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    // Changing a field in any language invalidates its confirmations.
    setConfirmed((current) => resetConfirmations(current, field))
  }

  function reviewControl(locale: Locale, field: NosotrosResearcherField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(nosotrosResearcherContent, review, uiLocale)}
        message={reviewMessage(nosotrosResearcherContent, review, stored, draft, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  return (
    <div ref={containerRef}>
      <LanguageTabs
        copyLang={uiLocale}
        flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        label={t('languageTabs')}
        onSelect={setTab}
        selected={tab}
        tablistContainer={headerSlot}
      >
        {(locale) => (
          <>
            {editing?.isLegacy && locale === defaultLocale ? (
              <Notice>{t('legacyBaseText')}</Notice>
            ) : null}

            {editing?.isLegacy && locale !== defaultLocale ? (
              <Notice tone="warning">{t('legacyNoTranslation')}</Notice>
            ) : null}

            <FormField
              error={errors[contentPath(locale, 'role')]}
              id={`${formId}-${locale}-role`}
              label={t('roleIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => setContent(locale, 'role', value)}
              required
              value={draft[locale].role}
            />
            {reviewControl(locale, 'role')}

            <FormField
              error={errors[contentPath(locale, 'description')]}
              id={`${formId}-${locale}-description`}
              label={t('descriptionIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              multiline
              onChange={(value) => setContent(locale, 'description', value)}
              value={draft[locale].description}
            />
            {reviewControl(locale, 'description')}
          </>
        )}
      </LanguageTabs>
    </div>
  )
}
