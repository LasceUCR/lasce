import { z } from 'zod'

import { COUNTRY_CODES } from './countries'

/**
 * The registration rules, in one place: field names, validation, user-facing
 * messages and the state the form and its Server Action exchange.
 *
 * This module is imported by the client-side form, so it must stay free of
 * `node:*` and database imports; hashing lives in `password.ts` and persistence
 * in `users.ts`, and only the Server Action touches those.
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

export const registrationMessages = {
  fullNameRequired: 'Ingresa tu nombre completo.',
  fullNameTooLong: 'El nombre no puede superar los 120 caracteres.',
  emailRequired: 'Ingresa tu correo electrónico.',
  emailInvalid: 'Ingresa un correo electrónico válido.',
  emailTooLong: 'El correo electrónico no puede superar los 254 caracteres.',
  emailTaken: 'Ya existe una cuenta con este correo electrónico.',
  institutionRequired: 'Ingresa tu institución.',
  institutionTooLong: 'La institución no puede superar los 160 caracteres.',
  countryRequired: 'Selecciona tu país.',
  passwordRequired: 'Ingresa una contraseña.',
  passwordTooShort: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
  passwordTooLong: `La contraseña no puede superar los ${PASSWORD_MAX_LENGTH} caracteres.`,
  confirmationRequired: 'Repite tu contraseña.',
  confirmationMismatch: 'Las contraseñas no coinciden.',
  reviewFields: 'Revisa los campos marcados para continuar.',
  unexpected: 'No pudimos crear tu cuenta. Inténtalo de nuevo en unos minutos.',
} as const

const messages = registrationMessages

export const registrationSchema = z
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

export function validateRegistration(input: RegistrationInput): RegistrationValidation {
  const result = registrationSchema.safeParse(input)
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
export const REGISTRATION_LABELS: Record<RegistrationFieldName, string> = {
  fullName: 'Nombre completo',
  email: 'Correo electrónico',
  institution: 'Institución',
  countryCode: 'País',
  password: 'Contraseña',
  passwordConfirmation: 'Repetir contraseña',
}

export const REGISTRATION_PLACEHOLDERS: Partial<Record<RegistrationFieldName, string>> = {
  fullName: 'Nombre y apellidos',
  email: 'correo@ejemplo.com',
  institution: 'Universidad / Centro de investigación',
  countryCode: 'Selecciona un país',
}

/** Copy owned by the registration card itself. */
export const registrationFormCopy = {
  requiredNote: 'Todos los campos son obligatorios.',
  passwordHint: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres.`,
  submit: 'Crear cuenta',
  submitting: 'Creando cuenta...',
  successTitle: 'Cuenta creada',
  successBody:
    'Tu cuenta quedó registrada. Podrás iniciar sesión cuando el acceso esté habilitado.',
  successLink: 'Volver al inicio',
} as const

export const registroMeta = {
  title: 'Crear cuenta | LASCE',
  description:
    'Crea una cuenta en el portal del Laboratorio de Astrofísica Solar y Clima Espacial de la Universidad de Costa Rica.',
} as const

export const registroIntro = {
  title: 'Crear cuenta',
  lead: 'Se aceptan correos personales o institucionales.',
} as const

export const registroBackLink = {
  href: '/',
  label: 'Volver al inicio',
} as const
