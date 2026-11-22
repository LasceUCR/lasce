import { z } from 'zod'

/**
 * The rule a new password must meet, in one place. Registration (`registration.ts`) and the
 * password reset form (`password-reset.ts`) both build their schemas from here, and the
 * requirements checklist under both password fields (`PasswordRequirements.tsx`) reads
 * `passwordRequirements` below, so the server and the form cannot disagree (issue #492).
 *
 * Client-safe: no `node:*` or database imports. The messages arrive from the caller, which builds
 * them from the visitor's language.
 *
 * Signing in does not apply this rule: an account created before it existed keeps its password.
 */

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

/** The kinds of character a new password must contain at least one of, in display order. */
export const PASSWORD_CHARACTER_CLASSES = ['uppercase', 'lowercase', 'number', 'special'] as const

export type PasswordCharacterClass = (typeof PASSWORD_CHARACTER_CLASSES)[number]

/** Every requirement the checklist shows: the length first, then each character class. */
export const PASSWORD_REQUIREMENTS = ['length', ...PASSWORD_CHARACTER_CLASSES] as const

export type PasswordRequirement = (typeof PASSWORD_REQUIREMENTS)[number]

/**
 * Unicode-aware, so "Ñ" is an uppercase letter and "é" a lowercase one. A special character is
 * anything that is not a letter, a combining mark (the accent of a decomposed "é"), a number or
 * whitespace: punctuation, symbols and emoji count, a space does not.
 */
const CHARACTER_CLASS_PATTERNS: Record<PasswordCharacterClass, RegExp> = {
  uppercase: /\p{Lu}/u,
  lowercase: /\p{Ll}/u,
  number: /\p{N}/u,
  special: /[^\p{L}\p{M}\p{N}\s]/u,
}

/**
 * Which requirements `password` meets. Pure and synchronous so the form can call it on every
 * keystroke. The length counts UTF-16 code units, exactly as the schema's `min` and `max` do.
 */
export function passwordRequirements(password: string): Record<PasswordRequirement, boolean> {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    uppercase: CHARACTER_CLASS_PATTERNS.uppercase.test(password),
    lowercase: CHARACTER_CLASS_PATTERNS.lowercase.test(password),
    number: CHARACTER_CLASS_PATTERNS.number.test(password),
    special: CHARACTER_CLASS_PATTERNS.special.test(password),
  }
}

/** The character classes `password` is missing, in display order. */
export function missingCharacterClasses(password: string): PasswordCharacterClass[] {
  const met = passwordRequirements(password)
  return PASSWORD_CHARACTER_CLASSES.filter((characterClass) => !met[characterClass])
}

/** The messages a new password and its confirmation can produce. */
export interface NewPasswordMessages {
  passwordRequired: string
  passwordTooShort: string
  passwordTooLong: string
  /** Opens the list of missing character classes: "La contraseña debe incluir:". */
  passwordMissingCharacters: string
  /** One list entry per class: "una letra mayúscula", "un número"... */
  passwordNeedsUppercase: string
  passwordNeedsLowercase: string
  passwordNeedsNumber: string
  passwordNeedsSpecial: string
  confirmationRequired: string
  confirmationMismatch: string
}

const NEEDS_MESSAGE: Record<PasswordCharacterClass, keyof NewPasswordMessages> = {
  uppercase: 'passwordNeedsUppercase',
  lowercase: 'passwordNeedsLowercase',
  number: 'passwordNeedsNumber',
  special: 'passwordNeedsSpecial',
}

/**
 * One message naming every missing class, because a form shows only the first message of a
 * field: "La contraseña debe incluir: una letra mayúscula, un número."
 */
export function missingCharactersMessage(
  messages: NewPasswordMessages,
  missing: readonly PasswordCharacterClass[],
): string {
  const list = missing.map((characterClass) => messages[NEEDS_MESSAGE[characterClass]]).join(', ')
  return `${messages.passwordMissingCharacters} ${list}.`
}

/**
 * A new password. Not trimmed: a leading or trailing space is a legitimate character. The length
 * is checked first, so a short password reports that before what it lacks.
 */
export function newPasswordSchema(messages: NewPasswordMessages) {
  return z
    .string()
    .min(1, { error: messages.passwordRequired })
    .min(PASSWORD_MIN_LENGTH, { error: messages.passwordTooShort })
    .max(PASSWORD_MAX_LENGTH, { error: messages.passwordTooLong })
    .check((context) => {
      const missing = missingCharacterClasses(context.value)
      if (missing.length === 0) return
      context.issues.push({
        code: 'custom',
        input: context.value,
        message: missingCharactersMessage(messages, missing),
      })
    })
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
