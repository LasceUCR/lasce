'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FormField, type FormFieldOption } from '@/app/components/public/FormField'
import { Notice } from '@/app/components/public/Notice'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
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
  rosacCardIcons,
  rosacCharacteristicContent,
  type RosacCardIcon,
  type RosacCharacteristicField,
  type RosacCharacteristicItem,
  type RosacCharacteristicUpdateInput,
} from '@/app/lib/rosac-schema'

export type RosacCharacteristicFormBody = RosacCharacteristicUpdateInput

export interface RosacCharacteristicFormProps {
  characteristic: RosacCharacteristicItem
  onSave: (body: RosacCharacteristicFormBody) => void
  onCancel: () => void
}

export function RosacCharacteristicForm({
  characteristic,
  onSave,
  onCancel,
}: RosacCharacteristicFormProps) {
  const t = useTranslations('rosac.editor')
  const siteLocale = useLocale()
  const uiLocale: Locale = isLocale(siteLocale) ? siteLocale : defaultLocale
  const stored = characteristic.editing?.content ?? {
    es: { title: characteristic.title, description: characteristic.description },
    en: null,
  }

  const iconOptions: FormFieldOption[] = rosacCardIcons.map((value) => ({
    value,
    label: t(`icons.${value}`),
  }))

  const formRef = useRef<HTMLDivElement>(null)
  const formId = useId()

  const [tab, setTab] = useState<Locale>(defaultLocale)
  const [draft, setDraft] = useState<ContentDraft<RosacCharacteristicField>>(() =>
    draftFromStored(rosacCharacteristicContent, stored),
  )
  const [confirmed, setConfirmed] = useState<ReviewConfirmation<RosacCharacteristicField>[]>([])
  const [icon, setIcon] = useState<RosacCardIcon>(characteristic.icon)
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  const needed = reviewsNeeded(rosacCharacteristicContent, stored, draft)
  const errors = attempted
    ? validateContent(rosacCharacteristicContent, stored, draft, confirmed, uiLocale)
    : {}

  const iconChanged = icon !== characteristic.icon
  const contentChanged = hasContentChanges(rosacCharacteristicContent, stored, draft)
  const isDirty = iconChanged || contentChanged

  function handleCancelClick() {
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    onCancel()
  }

  function setContent(locale: Locale, field: RosacCharacteristicField, value: string) {
    setDraft((current) => ({ ...current, [locale]: { ...current[locale], [field]: value } }))
    setConfirmed((current) => resetConfirmations(current, field))
  }

  function buildBody(): RosacCharacteristicFormBody {
    const version = characteristic.editing?.version ?? ''
    const content = toContentInput(rosacCharacteristicContent, draft)

    return {
      version,
      ...(iconChanged ? { icon } : {}),
      ...(contentChanged
        ? { content, confirmedUnchanged: confirmationsStillNeeded(confirmed, needed) }
        : {}),
    }
  }

  function handleConfirmClick() {
    setAttempted(true)
    const found = validateContent(rosacCharacteristicContent, stored, draft, confirmed, uiLocale)

    if (Object.keys(found).length > 0) {
      const target = tabWithErrors(found, tab)
      if (target) setTab(target)
      setFocusRequest((current) => current + 1)
      return
    }

    if (!iconChanged && !contentChanged) {
      onCancel()
      return
    }

    onSave(buildBody())
  }

  function reviewControl(locale: Locale, field: RosacCharacteristicField) {
    const review = needed.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(rosacCharacteristicContent, review, uiLocale)}
        message={reviewMessage(rosacCharacteristicContent, review, stored, draft, uiLocale)}
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
      >
        {(locale) => (
          <>
            {characteristic.editing?.isLegacy && locale === defaultLocale ? (
              <Notice>{t('legacyBaseText')}</Notice>
            ) : null}

            {characteristic.editing?.isLegacy && locale !== defaultLocale ? (
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
              label={t('descriptionIn', { language: localeLabels[locale] })}
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
        onChange={(value) => setIcon(value as RosacCardIcon)}
        options={iconOptions}
        value={icon}
      />

      <div className="cms-form-actions">
        <Button onClick={handleCancelClick} variant="secondary">
          {t('cancel')}
        </Button>
        <Button onClick={handleConfirmClick} variant="primary">
          {t('save')}
        </Button>
      </div>

      <StandardConfirmDialog
        cancelLabel={t('discardCancel')}
        confirmLabel={t('discardConfirm')}
        message={t('discardMessage')}
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onCancel()
        }}
        open={confirmDiscardOpen}
        severity="warning"
        title={t('discardTitle')}
      />
    </div>
  )
}
