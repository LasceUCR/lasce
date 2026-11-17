import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  newPasswordSchema,
  passwordConfirmationSchema,
  refinePasswordConfirmation,
  type NewPasswordMessages,
} from './password-rules'

const messages: NewPasswordMessages = {
  passwordRequired: 'required',
  passwordTooShort: 'short',
  passwordTooLong: 'long',
  confirmationRequired: 'confirm',
  confirmationMismatch: 'mismatch',
}

const schema = refinePasswordConfirmation(
  z.object({
    password: newPasswordSchema(messages),
    passwordConfirmation: passwordConfirmationSchema(messages),
  }),
  messages,
)

function errorsOf(input: { password: string; passwordConfirmation: string }) {
  const result = schema.safeParse(input)
  if (result.success) return {}
  // The forms show the first message of each field, so that is what the tests compare.
  return Object.fromEntries(
    Object.entries(z.flattenError(result.error).fieldErrors).map(([field, list]) => [
      field,
      list?.[0],
    ]),
  )
}

describe('new password rules', () => {
  test('accepts a password within the length limits that matches its confirmation', () => {
    const password = 'a'.repeat(PASSWORD_MIN_LENGTH)
    expect(schema.safeParse({ password, passwordConfirmation: password }).success).toBe(true)
  })

  test('keeps leading and trailing spaces', () => {
    const password = '  espacio  '
    expect(schema.parse({ password, passwordConfirmation: password }).password).toBe(password)
  })

  test('reports an empty password and an empty confirmation as required', () => {
    expect(errorsOf({ password: '', passwordConfirmation: '' })).toEqual({
      password: 'required',
      passwordConfirmation: 'confirm',
    })
  })

  test('rejects a password shorter than the minimum or longer than the maximum', () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1)
    const long = 'a'.repeat(PASSWORD_MAX_LENGTH + 1)
    expect(errorsOf({ password: short, passwordConfirmation: short }).password).toEqual('short')
    expect(errorsOf({ password: long, passwordConfirmation: long }).password).toEqual('long')
  })

  test('reports a mismatched confirmation on the confirmation field', () => {
    expect(errorsOf({ password: 'una contraseña', passwordConfirmation: 'otra cosa' })).toEqual({
      passwordConfirmation: 'mismatch',
    })
  })

  test('reports a mismatch next to a password that is also too short', () => {
    expect(errorsOf({ password: 'corta', passwordConfirmation: 'distinta' })).toEqual({
      password: 'short',
      passwordConfirmation: 'mismatch',
    })
  })
})
