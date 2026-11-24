import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  isPasswordResetTokenUsable: vi.fn(),
  resetPasswordWithToken: vi.fn(),
  deleteCookie: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/app/lib/auth/password', () => ({ hashPassword: mocks.hashPassword }))
vi.mock('@/app/lib/auth/password-reset-store', () => ({
  isPasswordResetTokenUsable: mocks.isPasswordResetTokenUsable,
  resetPasswordWithToken: mocks.resetPasswordWithToken,
}))
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ delete: mocks.deleteCookie }),
}))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

// `next-intl/server` throws outside a Next.js request, so it is mocked with the real Spanish
// catalogue, the convention `(public)/datos/actions.test.ts` set for `next-intl/server` callers.
vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl')
  const messages = (await import('@/messages/es.json')).default
  return {
    getTranslations: (namespace: string) =>
      Promise.resolve(createTranslator({ locale: 'es', messages, namespace: namespace as never })),
  }
})

import { RESET_DONE_HREF, initialResetState } from '@/app/lib/auth/password-reset'
import es from '@/messages/es.json' with { type: 'json' }

import { resetPassword } from './actions'

const token = 'A'.repeat(43)

function submission(password: string) {
  const formData = new FormData()
  formData.set('token', token)
  formData.set('password', password)
  formData.set('passwordConfirmation', password)
  return formData
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('resetPassword', () => {
  test('stores a new password that meets every requirement and sends the visitor on', async () => {
    mocks.isPasswordResetTokenUsable.mockResolvedValue(true)
    mocks.hashPassword.mockResolvedValue('hash')
    mocks.resetPasswordWithToken.mockResolvedValue({ ok: true })

    await resetPassword(initialResetState, submission('Clave-nueva-1'))

    expect(mocks.resetPasswordWithToken).toHaveBeenCalledWith(token, 'hash')
    expect(mocks.redirect).toHaveBeenCalledWith(RESET_DONE_HREF)
  })

  test('refuses a password missing character classes, names them and changes nothing', async () => {
    const state = await resetPassword(initialResetState, submission('clave-nueva'))

    const validation = es.auth.passwordReset.reset.validation
    expect(state).toEqual({
      status: 'error',
      fieldErrors: {
        password: `${validation.passwordMissingCharacters} ${validation.passwordNeedsUppercase}, ${validation.passwordNeedsNumber}.`,
      },
      formError: null,
    })
    expect(mocks.hashPassword).not.toHaveBeenCalled()
    expect(mocks.resetPasswordWithToken).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
