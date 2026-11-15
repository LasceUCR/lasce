'use client'

import { useRouter } from 'next/navigation'
import { useMessages, useTranslations } from 'next-intl'
import { useRef, useState, type FormEvent } from 'react'

import { Button } from '@/app/components/public/Button'
import { Notice } from '@/app/components/public/Notice'
import { FormField } from '@/app/components/public/auth/FormField'
import { useRequestFeedback } from '@/app/components/public/toast/useRequestFeedback'
import {
  EMAIL_SETTINGS_ENDPOINT,
  EMAIL_TEST_ENDPOINT,
  SMTP_SECURITY_MODES,
  getSmtpSettingsSchema,
  smtpSettingsFormValues,
  validateSmtpSettings,
  type SmtpSettingsField,
  type SmtpSettingsFieldErrors,
  type SmtpSettingsFormValues,
  type SmtpSettingsView,
} from '@/app/lib/mail-settings'

export interface EmailSettingsFormProps {
  title: string
  description: string
  /** The stored settings without their password, or `null` when none are saved yet. */
  settings: SmtpSettingsView | null
  /** False when the server has no key to encrypt a password with (no `CRON_SECRET`). */
  canStorePassword: boolean
  /** The signed-in administrator's address, where the test email goes. */
  testRecipient: string
}

/**
 * The Correo section of the administration panel: the SMTP server the portal sends email
 * through, and a button that sends a test message with the saved settings. The stored password
 * never reaches the browser; the form only says whether one exists, and an empty password field
 * keeps it. Field problems show next to the field; the outcome of a save or a test is a toast.
 */
export function EmailSettingsForm({
  title,
  description,
  settings,
  canStorePassword,
  testRecipient,
}: EmailSettingsFormProps) {
  const t = useTranslations('administration.email')
  const messages = useMessages()
  const router = useRouter()
  const sendWithFeedback = useRequestFeedback()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<SmtpSettingsFormValues>(() =>
    smtpSettingsFormValues(settings),
  )
  const [errors, setErrors] = useState<SmtpSettingsFieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const passwordStored = settings?.passwordConfigured ?? false

  function update(field: SmtpSettingsField) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { value } = event.target
      setValues((current) => ({ ...current, [field]: value }))
    }
  }

  function check(): SmtpSettingsFieldErrors {
    const validation = validateSmtpSettings(
      values,
      getSmtpSettingsSchema(messages.administration.email.validation),
    )
    const found = validation.ok ? {} : { ...validation.fieldErrors }
    if (!found.password && values.username.trim() !== '' && values.password === '') {
      if (!passwordStored) found.password = t('validation.passwordRequired')
    }
    return found
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = check()
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Let React render the messages, then take keyboard users to the first one.
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      )
      return
    }

    setSaving(true)
    try {
      await sendWithFeedback(
        EMAIL_SETTINGS_ENDPOINT,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
        {
          success: t('saved'),
          fallback: t('saveFailed'),
          onSuccess: () => {
            setValues((current) => ({ ...current, password: '' }))
            router.refresh()
          },
        },
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      await sendWithFeedback(
        EMAIL_TEST_ENDPOINT,
        { method: 'POST' },
        { success: t('test.sent', { email: testRecipient }), fallback: t('test.failed') },
      )
    } finally {
      setTesting(false)
    }
  }

  const securityOptions = SMTP_SECURITY_MODES.map((mode) => ({
    value: mode,
    label: t(`security.${mode}`),
  }))

  return (
    <div>
      <div className="section-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="email-settings-notices">
        {settings ? null : <Notice>{t('notConfigured')}</Notice>}
        {settings?.passwordUnreadable ? (
          <Notice tone="warning">{t('passwordUnreadable')}</Notice>
        ) : null}
        {canStorePassword ? null : <Notice tone="warning">{t('keyUnavailable')}</Notice>}
      </div>

      <section className="surface-card admin-panel" aria-labelledby="email-settings-form-title">
        <h2 id="email-settings-form-title">{t('title')}</h2>
        <form
          aria-busy={saving}
          className="registration-form email-settings-form"
          noValidate
          onSubmit={handleSubmit}
          ref={formRef}
        >
          <p className="form-required-note">{t('requiredNote')}</p>
          <FormField
            autoComplete="off"
            error={errors.host}
            label={t('labels.host')}
            name="host"
            onChange={update('host')}
            placeholder={t('placeholders.host')}
            required
            value={values.host}
          />
          <FormField
            autoComplete="off"
            error={errors.port}
            label={t('labels.port')}
            name="port"
            onChange={update('port')}
            placeholder="587"
            required
            value={values.port}
          />
          <FormField
            error={errors.security}
            label={t('labels.security')}
            name="security"
            onChange={update('security')}
            options={securityOptions}
            placeholder={t('placeholders.security')}
            required
            value={values.security}
          />
          <FormField
            autoComplete="off"
            error={errors.username}
            hint={t('hints.username')}
            label={t('labels.username')}
            name="username"
            onChange={update('username')}
            value={values.username}
          />
          <FormField
            autoComplete="new-password"
            error={errors.password}
            hint={passwordStored ? t('hints.passwordKeep') : t('hints.passwordNew')}
            label={t('labels.password')}
            name="password"
            onChange={update('password')}
            type="password"
            value={values.password}
          />
          <FormField
            autoComplete="off"
            error={errors.fromAddress}
            label={t('labels.fromAddress')}
            name="fromAddress"
            onChange={update('fromAddress')}
            placeholder={t('placeholders.fromAddress')}
            required
            type="email"
            value={values.fromAddress}
          />
          <FormField
            autoComplete="off"
            error={errors.fromName}
            label={t('labels.fromName')}
            name="fromName"
            onChange={update('fromName')}
            placeholder="LASCE"
            required
            value={values.fromName}
          />
          <div className="form-actions">
            <Button disabled={saving} type="submit" variant="brand">
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </section>

      <section className="surface-card admin-panel" aria-labelledby="email-settings-test-title">
        <h2 id="email-settings-test-title">{t('test.title')}</h2>
        <p>{t('test.body', { email: testRecipient })}</p>
        <Button disabled={testing || !settings} onClick={handleTest} type="button">
          {testing ? t('test.sending') : t('test.send')}
        </Button>
      </section>
    </div>
  )
}
