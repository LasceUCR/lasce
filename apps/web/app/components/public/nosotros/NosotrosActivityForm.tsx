'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { ConfirmDialog } from '@/app/components/public/ConfirmDialog'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import { defaultLocale, isLocale, localeLabels, locales, type Locale } from '@/app/lib/i18n/config'
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
  nosotrosActivityContent,
  nosotrosCardIcons,
  type NosotrosActivityCreateInput,
  type NosotrosActivityEditingData,
  type NosotrosActivityField,
  type NosotrosActivityUpdateInput,
  type NosotrosCardIcon,
} from '@/app/lib/nosotros-activity-schema'

/** The request body the form builds: a create body, or an update with only what changed. */
export type NosotrosActivityFormBody = NosotrosActivityCreateInput | NosotrosActivityUpdateInput

export interface NosotrosActivityFormProps {
  /**
   * `editing` of the card being edited: its text in both languages and the version to save
   * against. `null` when creating a card.
   */
  editing: NosotrosActivityEditingData | null
  /** The icon the form opens with. */
  icon: NosotrosCardIcon
  /** Called once the form is valid, with the body to send to `/api/nosotros/activities`. */
  onSave: (body: NosotrosActivityFormBody) => void
  onCancel: () => void
  /**
   * Whether "Confirmar" opens a confirmation dialog before calling `onSave`. Editing keeps it,
   * since there is no undo yet; creating a card turns it off and saves straight away.
   */
  requireConfirmation?: boolean
  /** Overrides the confirmation dialog's copy. */
  confirmTitle?: string
  confirmMessage?: string
}

/**
 * Creates or edits one Nosotros activity flashcard. The title and description sit in one tab per
 * language (`LanguageTabs`); the icon, shared by both languages, sits below, outside the tabs.
 * Both panels stay mounted, so switching tabs never loses what was typed, and the tabs never
 * change the site's language.
 *
 * When a title or description changes in one language only, the same field in the other language
 * must change too or be confirmed with a switch, in this edit. A legacy card (saved before
 * languages existed) opens with its base text on the Spanish tab, flagged as possibly not
 * Spanish, and an empty English tab: nothing is copied across to look like a translation. Its
 * icon can be saved without translating it.
 *
 * Saving asks for confirmation first unless `requireConfirmation` is false, same as
 * `EditableWrapper`'s delete action, since there is no undo yet.
 */
export function NosotrosActivityForm({
  editing,
  icon: initialIcon,
  onSave,
  onCancel,
  requireConfirmation = true,
  confirmTitle,
  confirmMessage,
}: NosotrosActivityFormProps) {
  const t = useTranslations('nosotros.activities.form')
  const siteLocale = useLocale()
  // Everything the editor says follows the site's language; the tabs only pick the translation.
  const uiLocale: Locale = isLocale(siteLocale) ? siteLocale : defaultLocale
  const stored = editing?.content ?? null
  const iconOptions: FormFieldOption[] = nosotrosCardIcons.map((value) => ({
    value,
    label: t(`icons.${value}`),
  }))
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLDivElement>(null)
  const formId = useId()

  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [draft, setDraft] = useState<ContentDraft<NosotrosActivityField>>(() =>
    draftFromStored(nosotrosActivityContent, stored),
  )
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<NosotrosActivityField>[]>([])
  const [icon, setIcon] = useState<NosotrosCardIcon>(initialIcon)
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  const needed = reviewsNeeded(nosotrosActivityContent, stored, draft)
  const errors = attempted
    ? validateContent(nosotrosActivityContent, stored, draft, confirmed, uiLocale)
    : {}

  const iconChanged = icon !== initialIcon
  const contentChanged = hasContentChanges(nosotrosActivityContent, stored, draft)
  const hasTypedText = locales.some((locale) =>
    nosotrosActivityContent.fields.some((field) => draft[locale][field].trim() !== ''),
  )
  // Creating starts from nothing, so only typed text or a different icon counts as unsaved.
  const isDirty = iconChanged || (editing ? contentChanged : hasTypedText)

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    onCancel()
  }

  function handleConfirmDiscard() {
    setConfirmDiscardOpen(false)
    onCancel()
  }

  function setContent(locale: Locale, field: NosotrosActivityField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    // Changing a field in any language invalidates its confirmations.
    setConfirmed((current) => resetConfirmations(current, field))
  }

  /** The body to send: everything while creating, only what changed while editing. */
  function buildBody(): NosotrosActivityFormBody {
    const content = toContentInput(nosotrosActivityContent, draft)
    if (!editing) return { icon, content }

    return {
      version: editing.version,
      ...(iconChanged ? { icon } : {}),
      ...(contentChanged
        ? { content, confirmedUnchanged: confirmationsStillNeeded(confirmed, needed) }
        : {}),
    }
  }

  function handleConfirmClick() {
    setAttempted(true)
    const found = validateContent(nosotrosActivityContent, stored, draft, confirmed, uiLocale)

    if (Object.keys(found).length > 0) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((current) => current + 1)
      return
    }

    // Nothing to save: close instead of sending an empty update.
    if (editing && !iconChanged && !contentChanged) {
      onCancel()
      return
    }

    if (requireConfirmation) {
      setConfirmOpen(true)
    } else {
      onSave(buildBody())
    }
  }

  function reviewControl(locale: Locale, field: NosotrosActivityField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(nosotrosActivityContent, review, uiLocale)}
        message={reviewMessage(nosotrosActivityContent, review, stored, draft, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  return (
    <div className="cms-form" ref={formRef}>
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
              error={errors[contentPath(locale, 'title')]}
              id={`${formId}-${locale}-title`}
              label={t('titleIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => setContent(locale, 'title', value)}
              required
              value={draft[locale].title}
            />
            {reviewControl(locale, 'title')}

            <FormField
              error={errors[contentPath(locale, 'description')]}
              id={`${formId}-${locale}-description`}
              label={t('textIn', { language: localeLabels[locale] })}
              lang={contentFieldLang(stored, locale)}
              multiline
              onChange={(value) => setContent(locale, 'description', value)}
              required
              value={draft[locale].description}
            />
            {reviewControl(locale, 'description')}
          </>
        )}
      </LanguageTabs>

      <FormField
        id={`${formId}-icon`}
        label={t('icon')}
        onChange={(value) => setIcon(value as NosotrosCardIcon)}
        options={iconOptions}
        value={icon}
      />

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          {t('cancel')}
        </Button>
        <Button onClick={handleConfirmClick} variant="primary">
          {t('confirm')}
        </Button>
      </div>

      {requireConfirmation ? (
        <ConfirmDialog
          message={confirmMessage ?? t('confirmMessage')}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false)
            onSave(buildBody())
          }}
          open={confirmOpen}
          title={confirmTitle ?? t('confirmTitle')}
        />
      ) : null}

      <StandardConfirmDialog
        cancelLabel={t('discard.cancel')}
        confirmLabel={t('discard.confirm')}
        message={t('discard.message')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={handleConfirmDiscard}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discard.title')}
      />
    </div>
  )
}
