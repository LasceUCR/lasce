'use client'

import styles from './InitiativeForm.module.css'
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
  initiativeDraft,
  initiativeRequest,
  validateInitiativeDraft,
  type InitiativeDraft,
} from '@/app/lib/initiative-form'
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
  type FormErrors,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import { initiativeContent } from '@/app/lib/initiative-schema'
import type { CollaborationInitiative } from '@/app/lib/collaborations'

export interface InitiativeFormHandle {
  requestCancel: () => void
  showErrors: (errors: FormErrors) => void
}
export interface InitiativeFormProps {
  initiative?: CollaborationInitiative
  onSave: (body: Record<string, unknown> | null) => void
  onCancel: () => void
  busy?: boolean
  ref?: Ref<InitiativeFormHandle>
}

/** The same editor for create and update, using the shared CMS fields and bilingual controls. */
export function InitiativeForm({
  initiative,
  onSave,
  onCancel,
  busy = false,
  ref,
}: InitiativeFormProps) {
  const t = useTranslations('initiatives')
  const validation = useTranslations('initiatives.validation')
  const uiLocale = resolveLocale(useLocale())
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const headerSlot = useModalHeaderSlot()
  const [initial] = useState(() => initiativeDraft(initiative))
  const [draft, setDraftState] = useState(initial)
  const [serverErrors, setServerErrors] = useState<FormErrors>({})
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<'title' | 'description'>[]>([])
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [discard, setDiscard] = useState(false)
  const stored = initiative?.editing?.content ?? null
  const needed = reviewsNeeded(initiativeContent, stored, draft.content)
  const validate = () =>
    validateInitiativeDraft(initiative, draft, confirmed, uiLocale, {
      logoUrl: validation('logoUrl'),
      websiteUrl: validation('websiteUrl'),
    })
  const errors = { ...(attempted ? validate() : {}), ...serverErrors }

  function setDraft(update: (value: InitiativeDraft) => InitiativeDraft) {
    setServerErrors({})
    setDraftState(update)
  }

  useEffect(() => {
    if (!focusRequest || busy) return
    Array.from(formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? [])
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest, busy])

  function requestCancel() {
    if (busy) return
    if (JSON.stringify(initial) !== JSON.stringify(draft)) setDiscard(true)
    else onCancel()
  }
  useImperativeHandle(ref, () => ({
    requestCancel,
    showErrors(found) {
      setServerErrors(found)
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((value) => value + 1)
    },
  }))

  return (
    <form
      className="initiative-form"
      noValidate
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        if (busy) return
        setServerErrors({})
        setAttempted(true)
        const found = validate()
        if (Object.keys(found).length) {
          const target = tabWithErrors(found, tab)
          if (target) setTab(target)
          setFocusRequest((value) => value + 1)
          return
        }
        onSave(
          initiativeRequest(
            initiative,
            initial,
            draft,
            confirmationsStillNeeded(confirmed, needed),
          ),
        )
      }}
    >
      <fieldset className={styles.fields} disabled={busy}>
        <LanguageTabs
          copyLang={uiLocale}
          label={t('editor.languages')}
          selected={tab}
          onSelect={setTab}
          tablistContainer={headerSlot}
          flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        >
          {(locale) => {
            return (
              <>
                {initiative?.editing?.isLegacy ? <Notice>{t('editor.legacy')}</Notice> : null}
                {initiativeContent.fields.map((field) => {
                  const review = needed.find(
                    (value) => value.locale === locale && value.field === field,
                  )
                  return (
                    <div key={field}>
                      <FormField
                        id={formId + '-' + locale + '-' + field}
                        label={t(field === 'title' ? 'editor.title' : 'editor.description', {
                          language: localeLabels[locale],
                        })}
                        required
                        multiline={field === 'description'}
                        maxLength={initiativeContent.specs[field].maxLength}
                        lang={contentFieldLang(stored, locale)}
                        value={draft.content[locale][field]}
                        error={errors[contentPath(locale, field)]}
                        onChange={(text) => {
                          setDraft((value) => ({
                            ...value,
                            content: {
                              ...value.content,
                              [locale]: { ...value.content[locale], [field]: text },
                            },
                          }))
                          setConfirmed((value) => value.filter((item) => item.field !== field))
                        }}
                      />
                      {review ? (
                        <TranslationReview
                          checked={isConfirmed(confirmed, review)}
                          label={confirmationLabel(initiativeContent, review, uiLocale)}
                          message={reviewMessage(
                            initiativeContent,
                            review,
                            stored,
                            draft.content,
                            uiLocale,
                          )}
                          onChange={(checked) => {
                            setServerErrors({})
                            setConfirmed((value) => withConfirmation(value, review, checked))
                          }}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </>
            )
          }}
        </LanguageTabs>
        <FormField
          id={formId + '-logo'}
          label={t('editor.logoUrl')}
          value={draft.logoUrl}
          error={errors.logoUrl}
          onChange={(logoUrl) => setDraft((value) => ({ ...value, logoUrl }))}
        />
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
