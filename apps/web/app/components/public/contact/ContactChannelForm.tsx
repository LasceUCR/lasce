'use client'

import { useId, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { Button } from '@/app/components/public/Button'
import { FormField } from '@/app/components/public/FormField'
import { Select } from '@/app/components/public/Select'
import { LanguageTabs } from '@/app/components/public/cms/LanguageTabs'
import { TranslationReview } from '@/app/components/public/cms/TranslationReview'
import type { Locale } from '@/app/lib/i18n/config'
import {
  contentFieldLang,
  draftFromStored,
  emptyContentDraft,
  reviewsNeeded,
  toContentInput,
  withConfirmation,
  type ContentDraft,
} from '@/app/lib/i18n/content/form'
import { confirmationLabel, reviewMessage } from '@/app/lib/i18n/content/review'
import {
  CONTACT_CHANNEL_ICONS,
  contactChannelContent,
  contactChannelCreateSchema,
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

export interface ContactChannelFormProps {
  /** `null` starts a new card. An existing card opens pre-filled, in both languages. */
  card: ContactCard | null
  onSave: (body: ContactChannelSaveBody) => void
  onCancel: () => void
}

export function ContactChannelForm({ card, onSave, onCancel }: ContactChannelFormProps) {
  const t = useTranslations('contact.cards')
  const uiLocale = useLocale() as Locale
  const iconFieldId = useId()
  const [icon, setIcon] = useState<ContactChannelIcon>(card?.icon ?? 'phone')
  const [href, setHref] = useState(card?.href ?? '')
  const [selected, setSelected] = useState<Locale>(uiLocale)
  const [draft, setDraft] = useState<ContentDraft<ContactChannelField>>(() =>
    card?.editing
      ? draftFromStored(contactChannelContent, card.editing.content)
      : emptyContentDraft(contactChannelContent),
  )
  const [confirmed, setConfirmed] = useState<ContactChannelReview[]>([])
  const [error, setError] = useState<string | null>(null)

  const stored = card?.editing?.content ?? null
  const pending = reviewsNeeded(contactChannelContent, stored, draft)
  const social = isSocialChannelIcon(icon)

  function setField(locale: Locale, field: ContactChannelField, value: string) {
    setDraft((current) => ({
      ...current,
      [locale]: { ...current[locale], [field]: value },
    }))
    setConfirmed((current) => current.filter((review) => review.field !== field))
  }

  function save() {
    const parsed = contactChannelCreateSchema.safeParse({
      icon,
      href: social ? href : null,
      content: toContentInput(contactChannelContent, draft),
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t('invalid'))
      const locale = parsed.error.issues[0]?.path[1]
      if (locale === 'es' || locale === 'en') setSelected(locale)
      return
    }

    const stillPending = pending.filter(
      (review) =>
        !confirmed.some((item) => item.locale === review.locale && item.field === review.field),
    )
    if (stillPending[0]) {
      setSelected(stillPending[0].locale)
      setError(t('review'))
      return
    }

    setError(null)
    onSave({
      icon: parsed.data.icon,
      href: parsed.data.href,
      content: parsed.data.content,
      ...(card?.editing ? { version: card.editing.version, confirmedUnchanged: confirmed } : {}),
    })
  }

  return (
    <div className="cms-form">
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

      <LanguageTabs label={t('language')} onSelect={setSelected} selected={selected}>
        {(locale) => (
          <>
            <FormField
              label={t('title')}
              lang={contentFieldLang(stored, locale)}
              onChange={(value) => setField(locale, 'title', value)}
              required
              value={draft[locale].title}
            />
            {pending
              .filter((review) => review.locale === locale && review.field === 'title')
              .map((review) => (
                <TranslationReview
                  checked={confirmed.some(
                    (item) => item.locale === review.locale && item.field === review.field,
                  )}
                  key={`${review.locale}-${review.field}`}
                  label={confirmationLabel(contactChannelContent, review, uiLocale)}
                  message={reviewMessage(contactChannelContent, review, stored, draft, uiLocale)}
                  onChange={(checked) =>
                    setConfirmed((current) => withConfirmation(current, review, checked))
                  }
                />
              ))}
            <FormField
              label={t('description')}
              lang={contentFieldLang(stored, locale)}
              multiline
              onChange={(value) => setField(locale, 'description', value)}
              required
              value={draft[locale].description}
            />
            {pending
              .filter((review) => review.locale === locale && review.field === 'description')
              .map((review) => (
                <TranslationReview
                  checked={confirmed.some(
                    (item) => item.locale === review.locale && item.field === review.field,
                  )}
                  key={`${review.locale}-${review.field}`}
                  label={confirmationLabel(contactChannelContent, review, uiLocale)}
                  message={reviewMessage(contactChannelContent, review, stored, draft, uiLocale)}
                  onChange={(checked) =>
                    setConfirmed((current) => withConfirmation(current, review, checked))
                  }
                />
              ))}
          </>
        )}
      </LanguageTabs>

      {social ? (
        <FormField
          label={t('link')}
          onChange={setHref}
          placeholder="https://"
          type="url"
          value={href}
        />
      ) : null}

      {error ? <p role="alert">{error}</p> : null}

      <div className="cms-form-actions">
        <Button onClick={onCancel} variant="secondary">
          {t('cancel')}
        </Button>
        <Button onClick={save} variant="primary">
          {t('confirm')}
        </Button>
      </div>
    </div>
  )
}
