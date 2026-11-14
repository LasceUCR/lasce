'use client'

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
import { defaultLocale, localeLabels, type Locale } from '@/app/lib/i18n/config'
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
import { resolveLocale } from '@/app/lib/i18n/locale'
import {
  scientificToolDraft,
  scientificToolRequest,
  validateScientificToolDraft,
  type ScientificToolDraft,
} from '@/app/lib/scientific-tool-form'
import { SCIENTIFIC_TOOL_IMAGE_ACCEPT } from '@/app/lib/scientific-tool-image'
import type { ScientificTool } from '@/app/lib/scientific-tool-records'
import {
  SCIENTIFIC_TOOL_NAME_MAX_LENGTH,
  SCIENTIFIC_TOOL_URL_MAX_LENGTH,
  scientificToolContent,
  type ScientificToolField,
} from '@/app/lib/scientific-tool-schema'
import styles from './ScientificToolForm.module.css'

export interface ScientificToolFormHandle {
  requestCancel: () => void
  showErrors: (errors: FormErrors) => void
}

export interface ScientificToolFormProps {
  /** The tool being edited; absent when adding one. */
  tool?: ScientificTool
  onSave: (body: Record<string, unknown> | null) => void | Promise<void>
  onUploadImage: (file: File) => Promise<string | null>
  onCancel: () => void
  busy?: boolean
  ref?: Ref<ScientificToolFormHandle>
}

/** The same editor for adding and editing a tool, with the shared bilingual controls. */
export function ScientificToolForm({
  tool,
  onSave,
  onUploadImage,
  onCancel,
  busy = false,
  ref,
}: ScientificToolFormProps) {
  const t = useTranslations('scientificTools')
  const validation = useTranslations('scientificTools.validation')
  const uiLocale = resolveLocale(useLocale())
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const headerSlot = useModalHeaderSlot()
  const [initial] = useState(() => scientificToolDraft(tool))
  const [draft, setDraftState] = useState(initial)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const uploadedImage = useRef<{ file: File; url: string } | null>(null)
  const pending = useRef(false)
  const [saving, setSaving] = useState(false)
  const isBusy = busy || saving
  const [serverErrors, setServerErrors] = useState<FormErrors>({})
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<ScientificToolField>[]>([])
  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [discard, setDiscard] = useState(false)
  const stored = tool?.editing?.content ?? null
  const needed = reviewsNeeded(scientificToolContent, stored, draft.content)
  const validate = () =>
    validateScientificToolDraft(tool, draft, confirmed, uiLocale, {
      name: validation('name'),
      nameTooLong: validation('nameTooLong'),
      accessUrl: validation('accessUrl'),
      imageUrl: validation('imageUrl'),
    })
  const errors = { ...(attempted ? validate() : {}), ...serverErrors }

  function setDraft(update: (value: ScientificToolDraft) => ScientificToolDraft) {
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
    if (imageFile || JSON.stringify(initial) !== JSON.stringify(draft)) setDiscard(true)
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
      if (imageFile) {
        // Retrying a failed save reuses the image already uploaded.
        const url =
          uploadedImage.current?.file === imageFile
            ? uploadedImage.current.url
            : await onUploadImage(imageFile)
        if (!url) return
        uploadedImage.current = { file: imageFile, url }
        nextDraft = { ...draft, imageUrl: url }
      }
      await onSave(
        scientificToolRequest(
          tool,
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
      noValidate
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
    >
      <fieldset className={styles.fields} disabled={isBusy}>
        <FormField
          id={`${formId}-name`}
          label={t('editor.name')}
          required
          maxLength={SCIENTIFIC_TOOL_NAME_MAX_LENGTH}
          value={draft.name}
          error={errors.name}
          onChange={(name) => setDraft((value) => ({ ...value, name }))}
        />
        <LanguageTabs
          copyLang={uiLocale}
          label={t('editor.languages')}
          selected={tab}
          onSelect={setTab}
          tablistContainer={headerSlot}
          flags={languageTabFlags(stored, errors, needed, confirmed, uiLocale)}
        >
          {(locale) => (
            <>
              {tool?.editing?.isLegacy ? <Notice>{t('editor.legacy')}</Notice> : null}
              {scientificToolContent.fields.map((field) => {
                const review = needed.find(
                  (value) => value.locale === locale && value.field === field,
                )
                return (
                  <div key={field}>
                    <FormField
                      id={`${formId}-${locale}-${field}`}
                      label={t('editor.description', { language: localeLabels[locale] })}
                      required
                      multiline
                      maxLength={scientificToolContent.specs[field].maxLength}
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
                        label={confirmationLabel(scientificToolContent, review, uiLocale)}
                        message={reviewMessage(
                          scientificToolContent,
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
          )}
        </LanguageTabs>
        <FormField
          id={`${formId}-access-url`}
          type="url"
          label={t('editor.accessUrl')}
          required
          maxLength={SCIENTIFIC_TOOL_URL_MAX_LENGTH}
          placeholder="https://"
          value={draft.accessUrl}
          error={errors.accessUrl}
          onChange={(accessUrl) => setDraft((value) => ({ ...value, accessUrl }))}
        />
        <FileDropInput
          label={t('editor.image')}
          helperText={t('editor.imageHelp')}
          accept={SCIENTIFIC_TOOL_IMAGE_ACCEPT}
          disabled={isBusy}
          existingImageUrl={initial.imageUrl || undefined}
          errorMessage={errors.imageUrl}
          onFileSelect={(file) => {
            setImageFile(file)
            uploadedImage.current = null
            setDraft((value) => ({ ...value, imageUrl: '' }))
          }}
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
