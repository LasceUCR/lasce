import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
  createSession: vi.fn(),
  redirect: vi.fn(),
}))

const intl = vi.hoisted(() => ({ locale: 'es' as 'es' | 'en' }))

vi.mock('@/app/lib/auth/password', () => ({
  UNKNOWN_USER_PASSWORD_HASH: 'unknown-user-hash',
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}))
vi.mock('@/app/lib/auth/users', () => ({
  createUser: mocks.createUser,
  findUserByEmail: mocks.findUserByEmail,
}))
vi.mock('@/app/lib/auth/session', () => ({ createSession: mocks.createSession }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

// `next-intl/server` throws outside a Next.js request, so it is mocked with the real catalogues,
// the convention `(public)/datos/actions.test.ts` set for `next-intl/server` callers.
vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl')
  const catalogues = {
    es: (await import('@/messages/es.json')).default,
    en: (await import('@/messages/en.json')).default,
  }
  return {
    getTranslations: (namespace: string) =>
      Promise.resolve(
        createTranslator({
          locale: intl.locale,
          messages: catalogues[intl.locale],
          namespace: namespace as never,
        }),
      ),
  }
})

import { initialLoginState } from '@/app/lib/auth/login'
import { initialRegistrationState } from '@/app/lib/auth/registration'
import en from '@/messages/en.json' with { type: 'json' }
import es from '@/messages/es.json' with { type: 'json' }

import { loginUser, registerUser } from './actions'

const account = {
  fullName: 'Ana Pérez Rojas',
  email: 'ana.perez@ucr.ac.cr',
  institution: 'Universidad de Costa Rica',
  countryCode: 'CR',
}

function registration(password: string) {
  const formData = new FormData()
  for (const [name, value] of Object.entries(account)) formData.set(name, value)
  formData.set('password', password)
  formData.set('passwordConfirmation', password)
  return formData
}

afterEach(() => {
  intl.locale = 'es'
  vi.clearAllMocks()
})

describe('registerUser', () => {
  test('creates the account when the password meets every requirement', async () => {
    mocks.hashPassword.mockResolvedValue('hash')

    const state = await registerUser(initialRegistrationState, registration('Clave-segura-1'))

    expect(state.status).toBe('success')
    expect(mocks.hashPassword).toHaveBeenCalledWith('Clave-segura-1')
    expect(mocks.createUser).toHaveBeenCalledWith({ ...account, passwordHash: 'hash' })
  })

  test('refuses a password missing character classes, names them and creates nothing', async () => {
    const state = await registerUser(initialRegistrationState, registration('clave segura'))

    const validation = es.auth.registration.validation
    expect(state).toEqual({
      status: 'error',
      values: account,
      fieldErrors: {
        password: `${validation.passwordMissingCharacters} ${validation.passwordNeedsUppercase}, ${validation.passwordNeedsNumber}, ${validation.passwordNeedsSpecial}.`,
      },
      formError: null,
    })
    expect(mocks.hashPassword).not.toHaveBeenCalled()
    expect(mocks.createUser).not.toHaveBeenCalled()
  })

  test('names the missing requirements in the visitor language', async () => {
    intl.locale = 'en'

    const state = await registerUser(initialRegistrationState, registration('CLAVE-SEGURA-1'))

    const validation = en.auth.registration.validation
    expect(state.fieldErrors.password).toBe(
      `${validation.passwordMissingCharacters} ${validation.passwordNeedsLowercase}.`,
    )
    expect(mocks.createUser).not.toHaveBeenCalled()
  })
})

describe('loginUser', () => {
  test('signs in an existing account whose password predates the requirements', async () => {
    mocks.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      fullName: account.fullName,
      role: 'USER',
      passwordHash: 'stored-hash',
    })
    mocks.verifyPassword.mockResolvedValue(true)
    const formData = new FormData()
    formData.set('email', account.email)
    formData.set('password', 'clave vieja')

    await loginUser(initialLoginState, formData)

    expect(mocks.verifyPassword).toHaveBeenCalledWith('clave vieja', 'stored-hash')
    expect(mocks.createSession).toHaveBeenCalledWith({
      id: 'user-1',
      fullName: account.fullName,
      role: 'USER',
    })
    expect(mocks.redirect).toHaveBeenCalled()
  })
})
