import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

import { COUNTRY_CODES } from './countries'

/**
 * The registration rules, in one place: field names, validation, user-facing
 * messages and the state the form and its Server Action exchange.
 *
 * This module is imported by the client-side form, so it must stay free of
 * `node:*` and database imports; hashing lives in `password.ts` and persistence
 * in `users.ts`, and only the Server Action touches those.
 *
 * The copy itself lives in the `auth.registration` namespace of the message
 * catalogues (see `docs/internationalization.md`); this module re-exports the
 * Spanish text as the default for request-less call sites (tests, stories, the
 * fallback schema below). A request builds its own schema from the visitor's
 * language with `getRegistrationSchema`, the same factory pattern as
 * `getScientificDataQuerySchema` in `lib/scientific-data.ts`.
 */

/** Form order. The schema below declares its keys in the same order. */
export const REGISTRATION_FIELDS = [
  'fullName',
  'email',
  'institution',
  'countryCode',
  'password',
  'passwordConfirmation',
] as const

export type RegistrationFieldName = (typeof REGISTRATION_FIELDS)[number]

/** One raw string per field, exactly as read from the request. */
export type RegistrationInput = Record<RegistrationFieldName, string>

export type RegistrationEchoField = Exclude<
  RegistrationFieldName,
  'password' | 'passwordConfirmation'
>

/** Submitted values echoed back so the visitor does not retype them. Never passwords. */
export type RegistrationValues = Record<RegistrationEchoField, string>

/** First message per failed field. */
export type RegistrationFieldErrors = Partial<Record<RegistrationFieldName, string>>

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export const registrationMessages = es.auth.registration.validation

/** The parts of a message catalogue `getRegistrationSchema` reads. */
export type RegistrationValidationMessages = Pick<
  typeof es.auth.registration.validation,
  | 'fullNameRequired'
  | 'fullNameTooLong'
  | 'emailRequired'
  | 'emailInvalid'
  | 'emailTooLong'
  | 'institutionRequired'
  | 'institutionTooLong'
  | 'countryRequired'
  | 'passwordRequired'
  | 'passwordTooShort'
  | 'passwordTooLong'
  | 'confirmationRequired'
  | 'confirmationMismatch'
>

/**
 * Builds the registration schema with its validation messages in `messages`' language. The
 * Server Action builds one from the request's translations; `registrationSchema` below is the
 * Spanish default other, request-less call sites use.
 */
export function getRegistrationSchema(messages: RegistrationValidationMessages) {
  return z
    .object({
      fullName: z
        .string()
        .trim()
        .min(1, { error: messages.fullNameRequired })
        .max(120, { error: messages.fullNameTooLong }),
      // Normalised before the format check so "  Ana@UCR.ac.cr " and
      // "ana@ucr.ac.cr" are the same account; the unique index relies on this.
      email: z
        .string()
        .trim()
        .toLowerCase()
        .max(254, { error: messages.emailTooLong })
        .pipe(
          z.email({
            error: (issue) => (issue.input === '' ? messages.emailRequired : messages.emailInvalid),
          }),
        ),
      institution: z
        .string()
        .trim()
        .min(1, { error: messages.institutionRequired })
        .max(160, { error: messages.institutionTooLong }),
      countryCode: z.enum(COUNTRY_CODES, { error: messages.countryRequired }),
      // Passwords are not trimmed: a leading or trailing space is a legitimate character.
      password: z
        .string()
        .min(1, { error: messages.passwordRequired })
        .min(PASSWORD_MIN_LENGTH, { error: messages.passwordTooShort })
        .max(PASSWORD_MAX_LENGTH, { error: messages.passwordTooLong }),
      passwordConfirmation: z.string().min(1, { error: messages.confirmationRequired }),
    })
    .refine(
      (data) => data.passwordConfirmation === '' || data.password === data.passwordConfirmation,
      {
        error: messages.confirmationMismatch,
        path: ['passwordConfirmation'],
        // Zod skips refinements once a sibling field has aborted (an unknown
        // country does). The mismatch must still be reported next to the other
        // errors, so this one always runs.
        when: () => true,
      },
    )
}

export const registrationSchema = getRegistrationSchema(registrationMessages)

export type RegistrationData = z.infer<typeof registrationSchema>

/**
 * Reads the six fields from a submitted form as strings. A missing or non-string
 * entry becomes "" so the schema reports the Spanish "required" message rather
 * than zod's default "expected string".
 */
export function readRegistrationInput(formData: FormData): RegistrationInput {
  const input = {} as RegistrationInput
  for (const field of REGISTRATION_FIELDS) {
    const value = formData.get(field)
    input[field] = typeof value === 'string' ? value : ''
  }
  return input
}

/** The non-secret fields, for refilling the form after a failed submission. */
export function toEchoValues(input: RegistrationInput): RegistrationValues {
  return {
    fullName: input.fullName,
    email: input.email,
    institution: input.institution,
    countryCode: input.countryCode,
  }
}

export type RegistrationValidation =
  { ok: true; data: RegistrationData } | { ok: false; fieldErrors: RegistrationFieldErrors }

/**
 * Validates registration input against `schema`, the Spanish default unless the caller built
 * one from the visitor's own language with `getRegistrationSchema`.
 */
export function validateRegistration(
  input: RegistrationInput,
  schema: ReturnType<typeof getRegistrationSchema> = registrationSchema,
): RegistrationValidation {
  const result = schema.safeParse(input)
  if (result.success) {
    return { ok: true, data: result.data }
  }

  const flattened = z.flattenError(result.error).fieldErrors
  const fieldErrors: RegistrationFieldErrors = {}
  for (const field of REGISTRATION_FIELDS) {
    const message = flattened[field]?.[0]
    if (message) {
      fieldErrors[field] = message
    }
  }
  return { ok: false, fieldErrors }
}

/** What the Server Action returns and the form renders. */
export interface RegistrationState {
  status: 'idle' | 'error' | 'success'
  values: RegistrationValues
  fieldErrors: RegistrationFieldErrors
  /** Summary for the alert region: validation summary, duplicate or unexpected failure. */
  formError: string | null
}

export const initialRegistrationState: RegistrationState = {
  status: 'idle',
  values: { fullName: '', email: '', institution: '', countryCode: '' },
  fieldErrors: {},
  formError: null,
}

/** Signature of the Server Action, in the shape React's `useActionState` expects. */
export type RegistrationAction = (
  state: RegistrationState,
  formData: FormData,
) => Promise<RegistrationState>

/** Visible labels, in the order the mockup and the ticket require. */
export const REGISTRATION_LABELS: Record<RegistrationFieldName, string> =
  es.auth.registration.labels

export const REGISTRATION_PLACEHOLDERS: Partial<Record<RegistrationFieldName, string>> =
  es.auth.registration.placeholders

/** Copy owned by the registration card itself. */
export const registrationFormCopy = {
  requiredNote: es.auth.registration.requiredNote,
  passwordHint: es.auth.registration.passwordHint,
  submit: es.auth.registration.submit,
  submitting: es.auth.registration.submitting,
  successTitle: es.auth.registration.successTitle,
  successBody: es.auth.registration.successBody,
  successLink: es.auth.registration.successLink,
} as const

/** Heading of the registration card on the access page. */
export const registroIntro = {
  title: es.auth.registration.heading.title,
  lead: es.auth.registration.heading.lead,
} as const
