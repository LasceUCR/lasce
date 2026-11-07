'use client'

import styles from './InitiativeForm.module.css'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Button } from '@/app/components/public/Button'
import { FileDropInput } from '@/app/components/public/FileDropInput'
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
import { INITIATIVE_LOGO_ACCEPT } from '@/app/lib/initiative-logo'
import type { CollaborationInitiative } from '@/app/lib/collaborations'

export interface InitiativeFormHandle {
  requestCancel: () => void
  showErrors: (errors: FormErrors) => void
}
export interface InitiativeFormProps {
  initiative?: CollaborationInitiative
  onSave: (body: Record<string, unknown> | null) => void | Promise<void>
  onUploadLogo: (file: File) => Promise<string | null>
  onCancel: () => void
  busy?: boolean
  ref?: Ref<InitiativeFormHandle>
}

/** The same editor for create and update, using the shared CMS fields and bilingual controls. */
export function InitiativeForm({
  initiative,
  onSave,
  onUploadLogo,
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const uploadedLogo = useRef<{ file: File; url: string } | null>(null)
  const pending = useRef(false)
  const [saving, setSaving] = useState(false)
  const isBusy = busy || saving
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
    if (!focusRequest || isBusy) return
    Array.from(formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? [])
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest, isBusy])

  function requestCancel() {
    if (busy || pending.current) return
    if (logoFile || JSON.stringify(initial) !== JSON.stringify(draft)) setDiscard(true)
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

  async function handleSave() {
    if (busy || pending.current) return
    setServerErrors({})
    setAttempted(true)
    const found = validate()
    if (Object.keys(found).length) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((value) => value + 1)
      return
    }
    pending.current = true
    setSaving(true)
    try {
      let nextDraft = draft
      if (logoFile) {
        // Retrying a failed record save reuses the uploaded file.
        const url =
          uploadedLogo.current?.file === logoFile
            ? uploadedLogo.current.url
            : await onUploadLogo(logoFile)
        if (!url) return
        uploadedLogo.current = { file: logoFile, url }
        nextDraft = { ...draft, logoUrl: url }
      }
      await onSave(
        initiativeRequest(
          initiative,
          initial,
          nextDraft,
          confirmationsStillNeeded(confirmed, needed),
        ),
      )
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  return (
    <form
      className="initiative-form"
      noValidate
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
    >
      <fieldset className={styles.fields} disabled={isBusy}>
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
        <FileDropInput
          label={t('editor.logo')}
          helperText={t('editor.logoHelp')}
          accept={INITIATIVE_LOGO_ACCEPT}
          disabled={isBusy}
          existingImageUrl={initial.logoUrl || undefined}
          errorMessage={errors.logoUrl}
          onFileSelect={(file) => {
            setLogoFile(file)
            uploadedLogo.current = null
            setDraft((value) => ({ ...value, logoUrl: '' }))
          }}
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
          <Button onClick={requestCancel} variant="secondary" disabled={isBusy}>
            {t('editor.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isBusy}>
            {t(isBusy ? 'editor.saving' : 'editor.save')}
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
