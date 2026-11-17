import { describe, expect, test } from 'vitest'

import {
  RESET_DONE_HREF,
  getRecoverySchema,
  getResetSchema,
  readResetInput,
  recoveryMessages,
  resetMessages,
  validateRecovery,
  validateReset,
} from './password-reset'
import { PASSWORD_MAX_LENGTH } from './password-rules'

describe('validateRecovery', () => {
  test('normalises the address the way registration stores it', () => {
    expect(validateRecovery('  Ana.Perez@UCR.ac.cr ')).toEqual({
      ok: true,
      email: 'ana.perez@ucr.ac.cr',
    })
  })

  test('asks for a missing address and rejects a malformed one', () => {
    expect(validateRecovery('')).toEqual({
      ok: false,
      fieldErrors: { email: recoveryMessages.emailRequired },
    })
    expect(validateRecovery('ana@')).toEqual({
      ok: false,
      fieldErrors: { email: recoveryMessages.emailInvalid },
    })
    expect(validateRecovery(`${'a'.repeat(250)}@ucr.ac.cr`)).toEqual({
      ok: false,
      fieldErrors: { email: recoveryMessages.emailInvalid },
    })
  })

  test('uses the messages of the schema it is given', () => {
    const schema = getRecoverySchema({ emailRequired: 'Enter it.', emailInvalid: 'Invalid.' })
    expect(validateRecovery('', schema)).toEqual({
      ok: false,
      fieldErrors: { email: 'Enter it.' },
    })
  })
})

describe('validateReset', () => {
  test('accepts a valid matching password and keeps its spaces', () => {
    expect(
      validateReset({ password: ' nueva clave ', passwordConfirmation: ' nueva clave ' }),
    ).toEqual({ ok: true, password: ' nueva clave ' })
  })

  test('applies the shared rule: required, length and confirmation', () => {
    expect(validateReset({ password: '', passwordConfirmation: '' })).toEqual({
      ok: false,
      fieldErrors: {
        password: resetMessages.passwordRequired,
        passwordConfirmation: resetMessages.confirmationRequired,
      },
    })
    expect(validateReset({ password: 'corta', passwordConfirmation: 'corta' })).toEqual({
      ok: false,
      fieldErrors: { password: resetMessages.passwordTooShort },
    })
    const long = 'a'.repeat(PASSWORD_MAX_LENGTH + 1)
    expect(validateReset({ password: long, passwordConfirmation: long })).toEqual({
      ok: false,
      fieldErrors: { password: resetMessages.passwordTooLong },
    })
    expect(validateReset({ password: 'una clave larga', passwordConfirmation: 'otra' })).toEqual({
      ok: false,
      fieldErrors: { passwordConfirmation: resetMessages.confirmationMismatch },
    })
  })

  test('uses the messages of the schema it is given', () => {
    const schema = getResetSchema({ ...resetMessages, passwordRequired: 'Enter a password.' })
    const result = validateReset({ password: '', passwordConfirmation: 'x' }, schema)
    expect(result.ok ? null : result.fieldErrors.password).toBe('Enter a password.')
  })
})

describe('readResetInput', () => {
  test('reads the token and both passwords, missing ones as empty strings', () => {
    const formData = new FormData()
    formData.set('token', 'abc')
    formData.set('password', 'una clave')
    formData.append('passwordConfirmation', new Blob(['x']))

    expect(readResetInput(formData)).toEqual({
      token: 'abc',
      password: 'una clave',
      passwordConfirmation: '',
    })
  })
})

test('sends a completed reset to the access page with its toast', () => {
  expect(RESET_DONE_HREF).toBe('/acceso?restablecida=1')
})
