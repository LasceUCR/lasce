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
import {
  hasUnsavedChanges,
  reviewsNeeded,
  validateDraft,
  type FormErrors,
  type NewsDraft,
  type NewsFormInitial,
} from '@/app/lib/news-form'
import {
  newsContent,
  type NewsField,
  type NewsFieldMessages,
  type ReviewConfirmation,
} from '@/app/lib/news-schema'

type SharedTextField = 'authors' | 'source' | 'publishedAt' | 'externalUrl'

/** What a parent can ask of the form: the modal around it routes its close button here. */
export interface NewsArticleFormHandle {
  /** Closes the form through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface NewsArticleFormProps {
  /** What the form opens with: from `emptyInitial()` or `initialFromArticle()`. */
  initial: NewsFormInitial
  /** Called once the edit is valid, with the confirmations it still needs. */
  onSave: (draft: NewsDraft, confirmed: ReviewConfirmation[]) => void
  /** Called to close the form, once any unsaved changes have been discarded. */
  onCancel: () => void
  /** True while a save is in flight: the fields and buttons are disabled. */
  busy?: boolean
  ref?: Ref<NewsArticleFormHandle>
}

/**
 * Creates or edits a news item in both languages. The title and abstract sit in one tab per
 * language (`LanguageTabs`); the source, authors, date and link are shared and sit below, outside
 * the tabs. Both panels stay mounted, so switching tabs never loses what was typed. The tabs only
 * choose the translation being edited; they never change the site's language.
 *
 * When a title or abstract changes in one language only, the same field in the other language
 * must change too or be confirmed with a switch. A legacy item (saved before languages existed)
 * opens with its base text on the Spanish tab and an empty English tab, and its shared fields can
 * be saved without translating it.
 *
 * Closing with unsaved changes asks first, from "Cancelar" or, through `ref`'s `requestCancel`,
 * from the modal's own close button and Escape.
 */
export function NewsArticleForm({
  initial,
  onSave,
  onCancel,
  busy = false,
  ref,
}: NewsArticleFormProps) {
  const formId = useId()
  // Everything the editor says follows the site's language; the tabs only pick the translation.
  const t = useTranslations('news')
  const validation = useTranslations('news.validation')
  const uiLocale = resolveLocale(useLocale())
  // In a modal, the language tabs sit beside its title and stay in view while the form scrolls.
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLFormElement>(null)

  const [draft, setDraft] = useState<NewsDraft>(initial.draft)
  const [confirmed, setConfirmed] = useState<ReviewConfirmation[]>([])
  const [attempted, setAttempted] = useState(false)
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [focusRequest, setFocusRequest] = useState(0)
  const [discardOpen, setDiscardOpen] = useState(false)

  const messages: NewsFieldMessages = {
    source: validation('source'),
    authors: validation('authors'),
    publishedAt: validation('publishedAt'),
    externalUrl: validation('externalUrl'),
  }

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  function requestCancel() {
    if (busy) return
    if (hasUnsavedChanges(initial, draft)) setDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  const needed = reviewsNeeded(initial, draft)
  const errors: FormErrors = attempted
    ? validateDraft(initial, draft, confirmed, uiLocale, messages)
    : {}

  function setContent(locale: Locale, field: NewsField, value: string) {
    setDraft((current) => ({
      ...current,
      content: { ...current.content, [locale]: { ...current.content[locale], [field]: value } },
    }))
    setConfirmed((current) => resetConfirmations(current, field))
  }

  function setShared(field: SharedTextField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit() {
    if (busy) return
    setAttempted(true)
    const found = validateDraft(initial, draft, confirmed, uiLocale, messages)

    if (Object.keys(found).length === 0) {
      onSave(draft, confirmationsStillNeeded(confirmed, needed))
      return
    }

    const target = tabWithErrors(found, tab)
    if (target) setTab(target)
    setFocusRequest((current) => current + 1)
  }

  function reviewControl(locale: Locale, field: NewsField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(newsContent, review, uiLocale)}
        message={reviewMessage(newsContent, review, initial.stored, draft.content, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  return (
    <form
      className="news-article-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit()
      }}
      ref={formRef}
    >
      <fieldset className="news-article-form-fields" disabled={busy}>
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
                value={draft.content[locale].title}
              />
              {reviewControl(locale, 'title')}

              <FormField
                error={errors[contentPath(locale, 'abstract')]}
                id={`${formId}-${locale}-abstract`}
                label={t('editor.abstractField', { language: localeLabels[locale] })}
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

        <div className="news-article-form-row">
          <FormField
            error={errors.authors}
            id={`${formId}-authors`}
            label={t('editor.authors')}
            onChange={(value) => setShared('authors', value)}
            placeholder={t('editor.authorsHint')}
            required
            value={draft.authors}
          />
          <FormField
            error={errors.source}
            id={`${formId}-source`}
            label={t('editor.source')}
            onChange={(value) => setShared('source', value)}
            required
            value={draft.source}
          />
        </div>

        <div className="news-article-form-row">
          <FormField
            error={errors.publishedAt}
            id={`${formId}-published-at`}
            label={t('editor.publishedAt')}
            onChange={(value) => setShared('publishedAt', value)}
            type="date"
            value={draft.publishedAt}
          />
          <FormField
            error={errors.externalUrl}
            id={`${formId}-external-url`}
            label={t('editor.externalUrl')}
            onChange={(value) => setShared('externalUrl', value)}
            required
            type="url"
            value={draft.externalUrl}
          />
        </div>

        <div className="news-article-form-actions">
          <Button onClick={requestCancel} variant="secondary">
            {t('editor.cancel')}
          </Button>
          <Button type="submit" variant="primary">
            {busy ? t('editor.saving') : t('editor.save')}
          </Button>
        </div>
      </fieldset>

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
    </form>
  )
}
