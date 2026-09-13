import { describe, expect, test } from 'vitest'

import {
  LOGIN_FIELDS,
  accessTabHref,
  initialLoginState,
  loginMessages,
  loginSchema,
  readLoginInput,
  validateLogin,
} from './login'

function formDataFrom(entries: Record<string, string | Blob>) {
  const formData = new FormData()
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value)
  }
  return formData
}

describe('LOGIN_FIELDS', () => {
  test('lists the schema keys, so the two cannot drift', () => {
    expect([...LOGIN_FIELDS]).toEqual(Object.keys(loginSchema.shape))
  })
})

describe('readLoginInput', () => {
  test('reads both fields and the return path, defaulting to empty strings', () => {
    expect(readLoginInput(formDataFrom({ email: 'ana@example.com' }))).toEqual({
      email: 'ana@example.com',
      password: '',
      next: '',
    })
    expect(
      readLoginInput(formDataFrom({ email: 'a', password: ' p ', next: '/datos', extra: 'x' })),
    ).toEqual({ email: 'a', password: ' p ', next: '/datos' })
  })

  test('ignores a non-string entry', () => {
    expect(readLoginInput(formDataFrom({ password: new Blob(['x']) })).password).toBe('')
  })
})

describe('validateLogin', () => {
  test('accepts valid input and normalises the email but not the password', () => {
    expect(validateLogin({ email: '  Ana@UCR.ac.cr ', password: ' secreta ', next: '' })).toEqual({
      ok: true,
      data: { email: 'ana@ucr.ac.cr', password: ' secreta ' },
    })
  })

  test('names both fields when the form is submitted empty', () => {
    expect(validateLogin({ email: '', password: '', next: '' })).toEqual({
      ok: false,
      fieldErrors: {
        email: loginMessages.emailRequired,
        password: loginMessages.passwordRequired,
      },
    })
  })

  test('rejects a malformed address', () => {
    expect(validateLogin({ email: 'no-es-un-correo', password: 'x', next: '' })).toEqual({
      ok: false,
      fieldErrors: { email: loginMessages.emailInvalid },
    })
  })

  test('treats an impossibly long password as wrong credentials', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'c'.repeat(129), next: '' })).toEqual({
      ok: false,
      fieldErrors: { password: loginMessages.invalidCredentials },
    })
  })
})

describe('initialLoginState', () => {
  test('starts idle with an empty email and no errors', () => {
    expect(initialLoginState).toEqual({
      status: 'idle',
      values: { email: '' },
      fieldErrors: {},
      formError: null,
    })
  })
})

describe('accessTabHref', () => {
  test('points at a tab and carries the return path when given', () => {
    expect(accessTabHref('register')).toBe('/acceso?tab=crear-cuenta')
    expect(accessTabHref('login', '/noticias')).toBe('/acceso?tab=iniciar-sesion&next=%2Fnoticias')
  })
})
