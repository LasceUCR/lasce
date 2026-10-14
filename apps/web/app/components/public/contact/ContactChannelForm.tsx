'use client'

import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FormField } from '@/app/components/public/FormField'
import { useModalHeaderSlot } from '@/app/components/public/Modal'
import { Select } from '@/app/components/public/Select'
import { StandardConfirmDialog } from '@/app/components/public/StandardConfirmDialog'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import type { Locale } from '@/app/lib/i18n/config'
import {
  contentFieldLang,
  contentPath,
  draftFromStored,
  emptyContentDraft,
  hasContentChanges,
  isConfirmed,
  languageTabFlags,
  reviewsNeeded,
  tabWithErrors,
  toContentInput,
  validateContent,
  withConfirmation,
  type ContentDraft,
  type FormErrors,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel } from '@/app/lib/i18n/content/review'
import {
  CONTACT_CHANNEL_ICONS,
  CONTACT_CHANNEL_DESCRIPTION_MAX,
  contactChannelContent,
  contactChannelCreateSchema,
  isSinglePhoneNumber,
  isSocialChannelIcon,
  type ContactCard,
  type ContactChannelContentInput,
  type ContactChannelField,
  type ContactChannelIcon,
  type ContactChannelReview,
} from '@/app/lib/contact-channel-schema'

export interface ContactChannelSaveBody {
  icon: ContactChannelIcon
  href: string | null
  content: ContactChannelContentInput
  version?: string
  confirmedUnchanged?: ContactChannelReview[]
}

export interface ContactChannelFormHandle {
  /** Closes through `onCancel`, first asking to discard any unsaved changes. */
  requestCancel: () => void
}

export interface ContactChannelFormProps {
  /** `null` starts a new card. An existing card opens pre-filled, in both languages. */
  card: ContactCard | null
  onSave: (body: ContactChannelSaveBody) => void
  onCancel: () => void
  /** The modal's close button and Escape call this, the same way "Cancelar" does. */
  ref?: Ref<ContactChannelFormHandle>
}

export function ContactChannelForm({ card, onSave, onCancel, ref }: ContactChannelFormProps) {
  const t = useTranslations('contact.cards')
  const uiLocale = useLocale() as Locale
  const headerSlot = useModalHeaderSlot()
  const formRef = useRef<HTMLDivElement>(null)
  const iconFieldId = useId()
  const initial = useRef({
    icon: (card?.icon ?? 'phone') as ContactChannelIcon,
    href: card?.href ?? '',
    draft: card?.editing
      ? draftFromStored(contactChannelContent, card.editing.content)
      : emptyContentDraft(contactChannelContent),
  })
  const [icon, setIcon] = useState<ContactChannelIcon>(initial.current.icon)
  const [href, setHref] = useState(initial.current.href)
  const [selected, setSelected] = useState<Locale>(uiLocale)
  const [draft, setDraft] = useState<ContentDraft<ContactChannelField>>(initial.current.draft)
  const [confirmed, setConfirmed] = useState<ContactChannelReview[]>([])
  const [attempted, setAttempted] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [descriptionOverLimit, setDescriptionOverLimit] = useState<Partial<Record<Locale, boolean>>>(
    {},
  )

  const stored = card?.editing?.content ?? null
  const pending = reviewsNeeded(contactChannelContent, stored, draft)
  const social = isSocialChannelIcon(icon)
  const errors: FormErrors = attempted ? fieldErrors() : {}

  useEffect(() => {
    if (focusRequest === 0) return
    const invalid = formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []
    Array.from(invalid)
      .find((element) => !element.closest('[hidden]'))
      ?.focus()
  }, [focusRequest])

  function linkError(): string | null {
    if (!social) return null
    const trimmed = href.trim()
    if (trimmed === '') return null
    if (trimmed.length > 500) return t('linkTooLong')
    if (!/^https:\/\/\S+$/i.test(trimmed)) return t('linkHttps')
    return null
  }

  function withSharedPhone(current: ContentDraft<ContactChannelField>) {
    if (icon !== 'phone') return current
    const number = current.es.description
    return {
      ...current,
      es: { ...current.es, description: number },
      en: { ...current.en, description: number },
    }
  }

  function fieldErrors(): FormErrors {
    const content = withSharedPhone(draft)
    const found = validateContent(contactChannelContent, stored, content, confirmed, uiLocale)
    if (icon === 'phone') {
      delete found[contentPath('es', 'description')]
      delete found[contentPath('en', 'description')]
      const number = content.es.description.trim()
      if (number === '') found.phone = t('phoneRequired')
      else if (!isSinglePhoneNumber(number)) found.phone = t('phoneSingle')
    }
    const link = linkError()
    if (link) found.href = link
    return found
  }

  function isDirty() {
    return (
      icon !== initial.current.icon ||
      href.trim() !== initial.current.href.trim() ||
      hasContentChanges(contactChannelContent, stored, draft)
    )
  }

  function requestCancel() {
    if (isDirty()) setDiscardOpen(true)
    else onCancel()
  }

  useImperativeHandle(ref, () => ({ requestCancel }))

  function setField(locale: Locale, field: ContactChannelField, value: string) {
    setDraft((current) => ({
      ...current,
      [locale]: { ...current[locale], [field]: value },
    }))
    setConfirmed((current) => current.filter((review) => review.field !== field))
  }

  function setDescription(locale: Locale, value: string) {
    const previous = draft[locale].description
    const over =
      value.length > CONTACT_CHANNEL_DESCRIPTION_MAX &&
      previous.length <= CONTACT_CHANNEL_DESCRIPTION_MAX
    setDescriptionOverLimit((current) => ({ ...current, [locale]: over }))
    setField(
      locale,
      'description',
      over ? value.slice(0, CONTACT_CHANNEL_DESCRIPTION_MAX) : value,
    )
  }

  function setPhone(value: string) {
    setDraft((current) => ({
      es: { ...current.es, description: value },
      en: { ...current.en, description: value },
    }))
    setConfirmed((current) => current.filter((review) => review.field !== 'description'))
  }

  function save() {
    setAttempted(true)
    const found = fieldErrors()

    if (Object.keys(found).length > 0) {
      const target = tabWithErrors(found, selected)
      if (target) setSelected(target)
      setFocusRequest((current) => current + 1)
      return
    }

    const parsed = contactChannelCreateSchema.safeParse({
      icon,
      href: social ? href : null,
      content: toContentInput(contactChannelContent, withSharedPhone(draft)),
    })
    if (!parsed.success) return

    onSave({
      icon: parsed.data.icon,
      href: parsed.data.href,
      content: parsed.data.content,
      ...(card?.editing ? { version: card.editing.version, confirmedUnchanged: confirmed } : {}),
    })
  }

  function reviewControl(locale: Locale, field: ContactChannelField) {
    const review = pending.find((each) => each.locale === locale && each.field === field)
    if (!review) return null

    return (
      <TranslationReview
        checked={isConfirmed(confirmed, review)}
        label={confirmationLabel(contactChannelContent, review, uiLocale)}
        onChange={(checked) =>
          setConfirmed((current) => withConfirmation(current, review, checked))
        }
      />
    )
  }

  return (
    <div className="cms-form" ref={formRef}>
      <label className="cms-form-field" htmlFor={iconFieldId}>
        <span className="cms-form-field-label">{t('icon')}</span>
        <Select
          id={iconFieldId}
          label={t('icon')}
          onChange={(value) => {
            if ((CONTACT_CHANNEL_ICONS as readonly string[]).includes(value)) {
              setIcon(value as ContactChannelIcon)
            }
          }}
          options={CONTACT_CHANNEL_ICONS.map((value) => ({ value, label: t(`icons.${value}`) }))}
          value={icon}
        />
      </label>

      <LanguageTabs
        copyLang={uiLocale}
        flags={languageTabFlags(stored, errors, pending, confirmed, uiLocale)}
        label={t('language')}
        onSelect={setSelected}
        selected={selected}
        tablistContainer={headerSlot}
      >
        {(locale) => (
          <>
            <FormField
              error={errors[contentPath(locale, 'title')]}
              label={t('title')}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => setField(locale, 'title', value)}
              required
              value={draft[locale].title}
            />
            {reviewControl(locale, 'title')}
            {icon === 'phone' ? null : (
              <>
                <FormField
                  error={
                    descriptionOverLimit[locale]
                      ? t('descriptionMax', { max: CONTACT_CHANNEL_DESCRIPTION_MAX })
                      : errors[contentPath(locale, 'description')]
                  }
                  label={t('description')}
                  lang={contentFieldLang(stored, locale)}
                  multiline
                  onChange={(value) => setDescription(locale, value)}
                  required
                  value={draft[locale].description}
                />
                {reviewControl(locale, 'description')}
              </>
            )}
          </>
        )}
      </LanguageTabs>

      {icon === 'phone' ? (
        <FormField
          error={errors.phone}
          label={t('phoneNumber')}
          onChange={setPhone}
          placeholder="2511-6566"
          required
          type="tel"
          value={draft.es.description}
        />
      ) : null}

      {social ? (
        <FormField
          error={errors.href}
          label={t('link')}
          onChange={setHref}
          placeholder="https://"
          type="url"
          value={href}
        />
      ) : null}

      <div className="cms-form-actions">
        <Button onClick={requestCancel} variant="secondary">
          {t('cancel')}
        </Button>
        <Button onClick={save} variant="primary">
          {t('confirm')}
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
