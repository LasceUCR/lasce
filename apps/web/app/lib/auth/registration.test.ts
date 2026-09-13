import { describe, expect, test } from 'vitest'

import {
  REGISTRATION_FIELDS,
  initialRegistrationState,
  readRegistrationInput,
  registrationMessages,
  registrationSchema,
  toEchoValues,
  validateRegistration,
  type RegistrationInput,
} from './registration'

const valid: RegistrationInput = {
  fullName: 'Ana Pérez Rojas',
  email: 'ana.perez@ucr.ac.cr',
  institution: 'Universidad de Costa Rica',
  countryCode: 'CR',
  password: 'una contraseña larga',
  passwordConfirmation: 'una contraseña larga',
}

function formDataFrom(entries: Record<string, string | Blob>) {
  const formData = new FormData()
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value)
  }
  return formData
}

describe('REGISTRATION_FIELDS', () => {
  test('lists the schema keys in form order, so the two cannot drift', () => {
    expect([...REGISTRATION_FIELDS]).toEqual(Object.keys(registrationSchema.shape))
  })
})

describe('readRegistrationInput', () => {
  test('turns missing and non-string entries into empty strings', () => {
    const input = readRegistrationInput(
      formDataFrom({ email: 'ana@example.com', fullName: new Blob(['x']) }),
    )

    expect(input).toEqual({
      fullName: '',
      email: 'ana@example.com',
      institution: '',
      countryCode: '',
      password: '',
      passwordConfirmation: '',
    })
  })

  test('keeps passwords exactly as typed, spaces included', () => {
    const input = readRegistrationInput(formDataFrom({ password: '  con espacios  ' }))

    expect(input.password).toBe('  con espacios  ')
  })
})

describe('validateRegistration', () => {
  test('accepts valid data and normalises the email and name', () => {
    const result = validateRegistration({
      ...valid,
      fullName: '  Ana Pérez Rojas  ',
      email: '  Ana.Perez@UCR.ac.cr ',
    })

    expect(result).toEqual({
      ok: true,
      data: { ...valid, fullName: 'Ana Pérez Rojas', email: 'ana.perez@ucr.ac.cr' },
    })
  })

  test('names every missing field when the form is submitted empty', () => {
    const result = validateRegistration({
      fullName: '',
      email: '',
      institution: '',
      countryCode: '',
      password: '',
      passwordConfirmation: '',
    })

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        fullName: registrationMessages.fullNameRequired,
        email: registrationMessages.emailRequired,
        institution: registrationMessages.institutionRequired,
        countryCode: registrationMessages.countryRequired,
        password: registrationMessages.passwordRequired,
        passwordConfirmation: registrationMessages.confirmationRequired,
      },
    })
  })

  test('reports every invalid format at once, including the mismatch next to an unknown country', () => {
    const result = validateRegistration({
      ...valid,
      email: 'no-es-un-correo',
      countryCode: 'XX',
      password: '1234567',
      passwordConfirmation: 'otra cosa',
    })

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        email: registrationMessages.emailInvalid,
        countryCode: registrationMessages.countryRequired,
        password: registrationMessages.passwordTooShort,
        passwordConfirmation: registrationMessages.confirmationMismatch,
      },
    })
  })

  test('asks for the confirmation before comparing it', () => {
    const result = validateRegistration({ ...valid, passwordConfirmation: '' })

    expect(result).toEqual({
      ok: false,
      fieldErrors: { passwordConfirmation: registrationMessages.confirmationRequired },
    })
  })

  test('rejects a lower-case or unassigned country code', () => {
    expect(validateRegistration({ ...valid, countryCode: 'cr' })).toEqual({
      ok: false,
      fieldErrors: { countryCode: registrationMessages.countryRequired },
    })
  })

  test('bounds the length of every text field', () => {
    const result = validateRegistration({
      ...valid,
      fullName: 'a'.repeat(121),
      email: `${'a'.repeat(250)}@x.co`,
      institution: 'b'.repeat(161),
      password: 'c'.repeat(129),
      passwordConfirmation: 'c'.repeat(129),
    })

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        fullName: registrationMessages.fullNameTooLong,
        email: registrationMessages.emailTooLong,
        institution: registrationMessages.institutionTooLong,
        password: registrationMessages.passwordTooLong,
      },
    })
  })
})

describe('toEchoValues', () => {
  test('returns the four non-secret fields and nothing else', () => {
    expect(toEchoValues(valid)).toEqual({
      fullName: valid.fullName,
      email: valid.email,
      institution: valid.institution,
      countryCode: valid.countryCode,
    })
  })
})

describe('initialRegistrationState', () => {
  test('starts idle with empty values and no errors', () => {
    expect(initialRegistrationState).toEqual({
      status: 'idle',
      values: { fullName: '', email: '', institution: '', countryCode: '' },
      fieldErrors: {},
      formError: null,
    })
  })
})
