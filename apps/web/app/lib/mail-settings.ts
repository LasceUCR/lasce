import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

/**
 * The SMTP settings the portal sends email through (`public.smtp_settings`), as the Correo
 * section of the administration panel edits them: field names, validation, and the shape the
 * page and its route handler exchange. See `docs/password-reset.md`.
 *
 * Client-safe: the form imports it, so it holds no `node:*` or database imports. Storage and
 * encryption live in `app/services/mail/`.
 */

/** Mirrored by the `smtp_settings_security_check` constraint. */
export const SMTP_SECURITY_MODES = ['tls', 'starttls', 'none'] as const

export type SmtpSecurity = (typeof SMTP_SECURITY_MODES)[number]

export function isSmtpSecurity(value: unknown): value is SmtpSecurity {
  return typeof value === 'string' && (SMTP_SECURITY_MODES as readonly string[]).includes(value)
}

/** Form order. */
export const SMTP_SETTINGS_FIELDS = [
  'host',
  'port',
  'security',
  'username',
  'password',
  'fromAddress',
  'fromName',
] as const

export type SmtpSettingsField = (typeof SMTP_SETTINGS_FIELDS)[number]

/** One raw string per field, as the form holds them. */
export type SmtpSettingsFormValues = Record<SmtpSettingsField, string>

export type SmtpSettingsFieldErrors = Partial<Record<SmtpSettingsField, string>>

/** What the page may show about the stored settings. Never the password, not even encrypted. */
export interface SmtpSettingsView {
  host: string
  port: number
  security: SmtpSecurity
  username: string | null
  fromAddress: string
  fromName: string
  /** A password is stored. */
  passwordConfigured: boolean
  /** A password is stored but cannot be decrypted, e.g. because `CRON_SECRET` changed. */
  passwordUnreadable: boolean
}

/** The route handler a save goes to (PUT) and the one that sends the test email (POST). */
export const EMAIL_SETTINGS_ENDPOINT = '/api/email-settings'
export const EMAIL_TEST_ENDPOINT = '/api/email-settings/test'

export const SMTP_PASSWORD_MAX_LENGTH = 512

export const smtpSettingsMessages = es.administration.email.validation

export type SmtpSettingsValidationMessages = typeof es.administration.email.validation

// A host name or an IP address: no spaces, no scheme, no path.
const HOST_PATTERN = /^[A-Za-z0-9.:[\]-]+$/

/**
 * Builds the schema with its messages in `messages`' language. The parsed result is what the
 * service stores: `port` as a number, an empty `username` as `null`, and an empty `password`
 * meaning "keep the stored one".
 */
export function getSmtpSettingsSchema(messages: SmtpSettingsValidationMessages) {
  return z.object({
    host: z
      .string()
      .trim()
      .min(1, { error: messages.hostRequired })
      .max(253, { error: messages.hostInvalid })
      .regex(HOST_PATTERN, { error: messages.hostInvalid }),
    port: z
      .union([z.string(), z.number()])
      // Decimal digits only: `Number()` alone would also accept "0x24B" or "5.87e2".
      .transform((value) =>
        typeof value === 'number' ? value : /^\d{1,5}$/.test(value.trim()) ? Number(value) : NaN,
      )
      .pipe(
        z
          .number({ error: messages.portInvalid })
          .int({ error: messages.portInvalid })
          .min(1, { error: messages.portInvalid })
          .max(65535, { error: messages.portInvalid }),
      ),
    security: z.enum(SMTP_SECURITY_MODES, { error: messages.securityRequired }),
    username: z
      .string()
      .trim()
      .max(254, { error: messages.usernameTooLong })
      .transform((value) => (value === '' ? null : value)),
    // Not trimmed: a password may start or end with a space.
    password: z.string().max(SMTP_PASSWORD_MAX_LENGTH, { error: messages.passwordTooLong }),
    fromAddress: z
      .string()
      .trim()
      .max(254, { error: messages.fromAddressInvalid })
      .pipe(
        z.email({
          error: (issue) =>
            issue.input === '' ? messages.fromAddressRequired : messages.fromAddressInvalid,
        }),
      ),
    fromName: z
      .string()
      .trim()
      .min(1, { error: messages.fromNameRequired })
      .max(120, { error: messages.fromNameTooLong }),
  })
}

export const smtpSettingsSchema = getSmtpSettingsSchema(smtpSettingsMessages)

/** The validated settings, as the service stores them. */
export type SmtpSettingsInput = z.infer<typeof smtpSettingsSchema>

export type SmtpSettingsValidation =
  { ok: true; data: SmtpSettingsInput } | { ok: false; fieldErrors: SmtpSettingsFieldErrors }

/** Validates the form values, keeping the first message of each failed field. */
export function validateSmtpSettings(
  values: unknown,
  schema: ReturnType<typeof getSmtpSettingsSchema> = smtpSettingsSchema,
): SmtpSettingsValidation {
  const result = schema.safeParse(values)
  if (result.success) return { ok: true, data: result.data }

  const flattened = z.flattenError(result.error).fieldErrors
  const fieldErrors: SmtpSettingsFieldErrors = {}
  for (const field of SMTP_SETTINGS_FIELDS) {
    const message = flattened[field]?.[0]
    if (message) fieldErrors[field] = message
  }
  return { ok: false, fieldErrors }
}

/** The form's starting values: the stored settings, or empty fields. The password is always empty. */
export function smtpSettingsFormValues(view: SmtpSettingsView | null): SmtpSettingsFormValues {
  return {
    host: view?.host ?? '',
    port: view ? String(view.port) : '',
    security: view?.security ?? '',
    username: view?.username ?? '',
    password: '',
    fromAddress: view?.fromAddress ?? '',
    fromName: view?.fromName ?? '',
  }
}
