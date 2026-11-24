import { describe, expect, test } from 'vitest'
import { z } from 'zod'

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  missingCharacterClasses,
  missingCharactersMessage,
  newPasswordSchema,
  passwordRequirements,
  passwordConfirmationSchema,
  refinePasswordConfirmation,
  type NewPasswordMessages,
} from './password-rules'

const messages: NewPasswordMessages = {
  passwordRequired: 'required',
  passwordTooShort: 'short',
  passwordTooLong: 'long',
  passwordMissingCharacters: 'Needs:',
  passwordNeedsUppercase: 'uppercase',
  passwordNeedsLowercase: 'lowercase',
  passwordNeedsNumber: 'number',
  passwordNeedsSpecial: 'special',
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
    const password = 'Aa1!'.repeat(PASSWORD_MIN_LENGTH / 4)
    expect(schema.safeParse({ password, passwordConfirmation: password }).success).toBe(true)
  })

  test('keeps leading and trailing spaces', () => {
    const password = '  Espacio 1!  '
    expect(schema.parse({ password, passwordConfirmation: password }).password).toBe(password)
  })

  test('reports an empty password and an empty confirmation as required', () => {
    expect(errorsOf({ password: '', passwordConfirmation: '' })).toEqual({
      password: 'required',
      passwordConfirmation: 'confirm',
    })
  })

  test('rejects a password shorter than the minimum or longer than the maximum', () => {
    const short = 'Aa1!xyz'
    const long = 'Aa1!'.repeat(PASSWORD_MAX_LENGTH / 4) + 'x'
    expect(short).toHaveLength(PASSWORD_MIN_LENGTH - 1)
    expect(errorsOf({ password: short, passwordConfirmation: short }).password).toEqual('short')
    expect(errorsOf({ password: long, passwordConfirmation: long }).password).toEqual('long')
  })

  test('reports a mismatched confirmation on the confirmation field', () => {
    expect(errorsOf({ password: 'Una contraseña 1!', passwordConfirmation: 'otra cosa' })).toEqual({
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

describe('password character requirements', () => {
  const valid = 'Clave-segura-1'

  test.each([
    ['an uppercase letter', 'clave-segura-1', 'Needs: uppercase.'],
    ['a lowercase letter', 'CLAVE-SEGURA-1', 'Needs: lowercase.'],
    ['a number', 'Clave-segura-uno', 'Needs: number.'],
    ['a special character', 'ClaveSegura1', 'Needs: special.'],
  ])('rejects a password without %s and names it', (_name, password, message) => {
    expect(errorsOf({ password, passwordConfirmation: password }).password).toBe(message)
  })

  test('names every missing class in one message, in display order', () => {
    const password = 'solominusculas'
    expect(errorsOf({ password, passwordConfirmation: password }).password).toBe(
      'Needs: uppercase, number, special.',
    )
  })

  test('accepts a password that has every class', () => {
    expect(errorsOf({ password: valid, passwordConfirmation: valid })).toEqual({})
  })

  test('reports the length before the missing classes', () => {
    expect(errorsOf({ password: 'abc', passwordConfirmation: 'abc' }).password).toBe('short')
  })

  test('counts accented and non-Latin letters by their case', () => {
    expect(passwordRequirements('Ñandú')).toMatchObject({ uppercase: true, lowercase: true })
    expect(passwordRequirements('ÉÑ')).toMatchObject({ uppercase: true, lowercase: false })
    expect(passwordRequirements('éñ')).toMatchObject({ uppercase: false, lowercase: true })
    expect(passwordRequirements('ΣΑΣ')).toMatchObject({ uppercase: true, lowercase: false })
    // Scripts without case have no upper or lower letters to offer.
    expect(passwordRequirements('密码')).toMatchObject({ uppercase: false, lowercase: false })
    const accepted = 'Ñandú-2026'
    expect(errorsOf({ password: accepted, passwordConfirmation: accepted })).toEqual({})
  })

  test('does not count whitespace or a decomposed accent as a special character', () => {
    expect(passwordRequirements('Clave segura 1').special).toBe(false)
    expect(passwordRequirements('Clave\tsegura\u00a01').special).toBe(false)
    expect(passwordRequirements('Cafe\u0301 seguro 1').special).toBe(false)
  })

  test('does not count invisible format or control characters as special', () => {
    for (const character of ['\u200b', '\u00ad', '\ufeff', '\u200d', '\u0007']) {
      expect(passwordRequirements(`Contrasena1${character}`).special).toBe(false)
    }
  })

  test('counts punctuation, symbols and emoji as special characters', () => {
    for (const character of ['!', '#', '@', '_', '-', '€', '¿', '🚀']) {
      expect(passwordRequirements(`Clave1${character}`).special).toBe(true)
    }
  })

  test('counts any digit as a number', () => {
    expect(passwordRequirements('0').number).toBe(true)
    expect(passwordRequirements('9').number).toBe(true)
    expect(passwordRequirements('sin numeros').number).toBe(false)
  })

  test('reports the length requirement within both limits only', () => {
    expect(passwordRequirements('a'.repeat(PASSWORD_MIN_LENGTH - 1)).length).toBe(false)
    expect(passwordRequirements('a'.repeat(PASSWORD_MIN_LENGTH)).length).toBe(true)
    expect(passwordRequirements('a'.repeat(PASSWORD_MAX_LENGTH)).length).toBe(true)
    expect(passwordRequirements('a'.repeat(PASSWORD_MAX_LENGTH + 1)).length).toBe(false)
  })

  test('lists the missing classes and builds the message from them', () => {
    expect(missingCharacterClasses('')).toEqual(['uppercase', 'lowercase', 'number', 'special'])
    expect(missingCharacterClasses(valid)).toEqual([])
    expect(missingCharactersMessage(messages, ['number', 'special'])).toBe(
      'Needs: number, special.',
    )
  })
})
