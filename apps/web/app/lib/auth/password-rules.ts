import { z } from 'zod'

/**
 * The rule a new password must meet, in one place. Registration (`registration.ts`) and the
 * password reset form (`password-reset.ts`) both build their schemas from here, so tightening the
 * rule (issue #492) changes both at once.
 *
 * Client-safe: no `node:*` or database imports. The messages arrive from the caller, which builds
 * them from the visitor's language.
 */

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

/** The messages a new password and its confirmation can produce. */
export interface NewPasswordMessages {
  passwordRequired: string
  passwordTooShort: string
  passwordTooLong: string
  confirmationRequired: string
  confirmationMismatch: string
}

/** A new password. Not trimmed: a leading or trailing space is a legitimate character. */
export function newPasswordSchema(messages: NewPasswordMessages) {
  return z
    .string()
    .min(1, { error: messages.passwordRequired })
    .min(PASSWORD_MIN_LENGTH, { error: messages.passwordTooShort })
    .max(PASSWORD_MAX_LENGTH, { error: messages.passwordTooLong })
}

/** The repeated password. Whether it matches is checked by `refinePasswordConfirmation`. */
export function passwordConfirmationSchema(messages: NewPasswordMessages) {
  return z.string().min(1, { error: messages.confirmationRequired })
}

interface WithNewPassword {
  password: string
  passwordConfirmation: string
}

/**
 * Adds the "both passwords match" check to an object schema holding `password` and
 * `passwordConfirmation`. A mismatch is reported on the confirmation only when it is not empty
 * (the empty case already says "required"), and it runs even when a sibling field aborted, so it
 * is reported next to the other errors.
 */
export function refinePasswordConfirmation<Schema extends z.ZodType<WithNewPassword>>(
  schema: Schema,
  messages: NewPasswordMessages,
) {
  return schema.refine(
    (data) => data.passwordConfirmation === '' || data.password === data.passwordConfirmation,
    {
      error: messages.confirmationMismatch,
      path: ['passwordConfirmation'],
      when: () => true,
    },
  )
}
