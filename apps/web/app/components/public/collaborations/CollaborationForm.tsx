'use client'

import styles from './CollaborationForm.module.css'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Button } from '@/app/components/public/Button'
import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import {
  collaborationDraft,
  collaborationRequest,
  validateCollaborationDraft,
} from '@/app/lib/collaboration-form'
import { defaultLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
import { resolveLocale } from '@/app/lib/i18n/locale'
import type { ReviewConfirmation } from '@/app/lib/i18n/content/definition'
import {
  confirmationsStillNeeded,
  contentFieldLang,
  contentPath,
  isConfirmed,
  languageTabFlags,
  reviewsNeeded,
  tabWithErrors,
  withConfirmation,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import { collaborationContent, type ResearchCollaboration } from '@/app/lib/research-collaborations'

export interface CollaborationFormHandle {
  requestCancel: () => void
}
export interface CollaborationFormProps {
  collaboration?: ResearchCollaboration
  onSave: (body: Record<string, unknown> | null) => void
  onCancel: () => void
  busy?: boolean
  ref?: Ref<CollaborationFormHandle>
}

/** The same editor for create and update, using the shared CMS fields and bilingual controls. */
export function CollaborationForm({
  collaboration,
  onSave,
  onCancel,
  busy = false,
  ref,
}: CollaborationFormProps) {
  const t = useTranslations('collaborations')
  const validation = useTranslations('collaborations.validation')
  const uiLocale = resolveLocale(useLocale())
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const headerSlot = useModalHeaderSlot()
  const [initial] = useState(() => collaborationDraft(collaboration))
  const [draft, setDraft] = useState(initial)
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<'country'>[]>([])
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [discard, setDiscard] = useState(false)
  const stored = collaboration?.editing?.content ?? null
  const needed = reviewsNeeded(collaborationContent, stored, draft.content)
  const validate = () =>
    validateCollaborationDraft(collaboration, draft, confirmed, uiLocale, {
      name: validation('name'),
      scope: validation('scope'),
      acronym: validation('acronym'),
      url: validation('url'),
    })
  const errors = attempted ? validate() : {}

  useEffect(() => {
    if (!focusRequest) return
    Array.from(formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? [])
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  function requestCancel() {
    if (busy) return
    if (JSON.stringify(initial) !== JSON.stringify(draft)) setDiscard(true)
    else onCancel()
  }
  useImperativeHandle(ref, () => ({ requestCancel }))

  return (
    <form
      className="collaboration-form"
      noValidate
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        if (busy) return
        setAttempted(true)
        const found = validate()
        if (Object.keys(found).length) {
          const target = tabWithErrors(found, tab)
          if (target) setTab(target)
          setFocusRequest((value) => value + 1)
          return
        }
        onSave(
          collaborationRequest(
            collaboration,
            initial,
            draft,
            confirmationsStillNeeded(confirmed, needed),
          ),
        )
      }}
    >
      <fieldset className={styles.fields} disabled={busy}>
        <FormField
          id={`${formId}-name`}
          label={t('editor.name')}
          required
          value={draft.name}
          error={errors.name}
          onChange={(name) => setDraft((value) => ({ ...value, name }))}
        />
        <div className="cms-form-grid cms-form-grid-2">
          <FormField
            id={`${formId}-acronym`}
            label={t('editor.acronym')}
            value={draft.acronym}
            error={errors.acronym}
            onChange={(acronym) => setDraft((value) => ({ ...value, acronym }))}
          />
          <FormField
            id={`${formId}-scope`}
            label={t('editor.scope')}
            required
            value={draft.scope}
            error={errors.scope}
            options={[
              { value: 'national', label: t('card.national') },
              { value: 'international', label: t('card.international') },
            ]}
            onChange={(scope) =>
              setDraft((value) => ({ ...value, scope: scope as ResearchCollaboration['scope'] }))
            }
          />
        </div>
        <LanguageTabs
          copyLang={uiLocale}
          label={t('editor.languages')}
          selected={tab}
          onSelect={setTab}
          tablistContainer={headerSlot}
          flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        >
          {(locale) => {
            const review = needed.find((value) => value.locale === locale)
            return (
              <>
                {collaboration?.editing?.isLegacy ? <Notice>{t('editor.legacy')}</Notice> : null}
                <FormField
                  id={`${formId}-${locale}-country`}
                  label={t('editor.country', { language: localeLabels[locale] })}
                  required
                  lang={contentFieldLang(stored, locale)}
                  value={draft.content[locale].country}
                  error={errors[contentPath(locale, 'country')]}
                  onChange={(country) => {
                    setDraft((value) => ({
                      ...value,
                      content: { ...value.content, [locale]: { country } },
                    }))
                    setConfirmed([])
                  }}
                />
                {review ? (
                  <TranslationReview
                    checked={isConfirmed(confirmed, review)}
                    label={confirmationLabel(collaborationContent, review, uiLocale)}
                    message={reviewMessage(
                      collaborationContent,
                      review,
                      stored,
                      draft.content,
                      uiLocale,
                    )}
                    onChange={(checked) =>
                      setConfirmed((value) => withConfirmation(value, review, checked))
                    }
                  />
                ) : null}
              </>
            )
          }}
        </LanguageTabs>
        <FormField
          id={`${formId}-website`}
          type="url"
          label={t('editor.websiteUrl')}
          value={draft.websiteUrl}
          error={errors.websiteUrl}
          onChange={(websiteUrl) => setDraft((value) => ({ ...value, websiteUrl }))}
        />
        <div className="cms-form-actions">
          <Button onClick={requestCancel} variant="secondary" disabled={busy}>
            {t('editor.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {t(busy ? 'editor.saving' : 'editor.save')}
          </Button>
        </div>
      </fieldset>
      <StandardConfirmDialog
        open={discard}
        title={t('discard.title')}
        message={t('discard.message')}
        cancelLabel={t('discard.keepEditing')}
        confirmLabel={t('discard.confirm')}
        severity="warning"
        onCancel={() => setDiscard(false)}
        onConfirm={onCancel}
      />
    </form>
  )
}
