import { z } from 'zod'

import es from '@/messages/es.json' with { type: 'json' }

import {
  newPasswordSchema,
  passwordConfirmationSchema,
  refinePasswordConfirmation,
  type NewPasswordMessages,
} from './password-rules'

/**
 * The forgot-password rules, in one place: routes, fields, validation and the state the two
 * forms exchange with their Server Actions (LASCE-CON-0012-448). Mirrors `login.ts` and, like it,
 * is imported by client components, so it holds no `node:*` or database imports; tokens live in
 * `password-reset-token.ts` and persistence in `password-reset-store.ts`.
 *
 * The copy lives in `auth.passwordReset` of the message catalogues. This module re-exports the
 * Spanish text for request-less call sites (tests, stories); requests build their schemas from
 * the visitor's language. See `docs/password-reset.md`.
 */

/** Where "¿Olvidaste tu contraseña?" leads: the form that asks for the email address. */
export const PASSWORD_RECOVERY_PATH = '/recuperar-contrasena'
/** Where the emailed link leads, with the token in `?token=`. */
export const PASSWORD_RESET_PATH = '/restablecer-contrasena'
export const RESET_TOKEN_PARAM = 'token'
/** The access page shows a success toast when a reset sends the visitor back with this. */
export const RESET_DONE_PARAM = 'restablecida'

/** How long an emailed link works. `password-reset-token.ts` enforces it. */
export const RESET_TOKEN_TTL_MINUTES = 30

// ----- Request form: the email address --------------------------------------------------------

export type RecoveryFieldErrors = Partial<Record<'email', string>>

export const recoveryMessages = es.auth.passwordReset.request.validation

export type RecoveryValidationMessages = typeof es.auth.passwordReset.request.validation

export function getRecoverySchema(messages: RecoveryValidationMessages) {
  return z.object({
    // Normalised the way registration stores it, so the lookup finds the account.
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(254, { error: messages.emailInvalid })
      .pipe(
        z.email({
          error: (issue) => (issue.input === '' ? messages.emailRequired : messages.emailInvalid),
        }),
      ),
  })
}

export const recoverySchema = getRecoverySchema(recoveryMessages)

export type RecoveryValidation =
  { ok: true; email: string } | { ok: false; fieldErrors: RecoveryFieldErrors }

export function validateRecovery(
  email: string,
  schema: ReturnType<typeof getRecoverySchema> = recoverySchema,
): RecoveryValidation {
  const result = schema.safeParse({ email })
  if (result.success) return { ok: true, email: result.data.email }
  const message = z.flattenError(result.error).fieldErrors.email?.[0]
  return { ok: false, fieldErrors: message ? { email: message } : {} }
}

/**
 * What the request action returns. `success` is the same answer for every valid address,
 * registered or not, so the page never tells whether an account exists.
 */
export interface RecoveryState {
  status: 'idle' | 'error' | 'success'
  values: { email: string }
  fieldErrors: RecoveryFieldErrors
}

export const initialRecoveryState: RecoveryState = {
  status: 'idle',
  values: { email: '' },
  fieldErrors: {},
}

export type RecoveryAction = (state: RecoveryState, formData: FormData) => Promise<RecoveryState>

// ----- Reset form: the new password -----------------------------------------------------------

export const RESET_FIELDS = ['password', 'passwordConfirmation'] as const

export type ResetFieldName = (typeof RESET_FIELDS)[number]

export type ResetFieldErrors = Partial<Record<ResetFieldName, string>>

export const resetMessages = es.auth.passwordReset.reset.validation

export type ResetValidationMessages = NewPasswordMessages

/** The shared new-password rule, the same one registration applies. */
export function getResetSchema(messages: ResetValidationMessages) {
  return refinePasswordConfirmation(
    z.object({
      password: newPasswordSchema(messages),
      passwordConfirmation: passwordConfirmationSchema(messages),
    }),
    messages,
  )
}

export const resetSchema = getResetSchema(resetMessages)

export interface ResetInput {
  token: string
  password: string
  passwordConfirmation: string
}

/** Reads the token and both passwords as strings ("" when missing or not a string). */
export function readResetInput(formData: FormData): ResetInput {
  const read = (name: string) => {
    const value = formData.get(name)
    return typeof value === 'string' ? value : ''
  }
  return {
    token: read(RESET_TOKEN_PARAM),
    password: read('password'),
    passwordConfirmation: read('passwordConfirmation'),
  }
}

export type ResetValidation =
  { ok: true; password: string } | { ok: false; fieldErrors: ResetFieldErrors }

export function validateReset(
  input: Pick<ResetInput, 'password' | 'passwordConfirmation'>,
  schema: ReturnType<typeof getResetSchema> = resetSchema,
): ResetValidation {
  const result = schema.safeParse({
    password: input.password,
    passwordConfirmation: input.passwordConfirmation,
  })
  if (result.success) return { ok: true, password: result.data.password }

  const flattened = z.flattenError(result.error).fieldErrors
  const fieldErrors: ResetFieldErrors = {}
  for (const field of RESET_FIELDS) {
    const message = flattened[field]?.[0]
    if (message) fieldErrors[field] = message
  }
  return { ok: false, fieldErrors }
}

/**
 * What the reset action returns. A successful reset redirects to the access page, so there is
 * no success state. `invalid-token` replaces the form with the "request a new link" panel:
 * the token expired, was used, or never existed, and the visitor is not told which.
 */
export interface ResetState {
  status: 'idle' | 'error' | 'invalid-token'
  fieldErrors: ResetFieldErrors
  /** An unexpected failure, shown in a toast. */
  formError: string | null
}

export const initialResetState: ResetState = { status: 'idle', fieldErrors: {}, formError: null }

export const invalidTokenState: ResetState = {
  status: 'invalid-token',
  fieldErrors: {},
  formError: null,
}

export type ResetAction = (state: ResetState, formData: FormData) => Promise<ResetState>

/** The access page with the "password updated" toast. */
export const RESET_DONE_HREF = `/acceso?${RESET_DONE_PARAM}=1`
