import { IntlError, IntlErrorCode } from 'next-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { getMessageFallback, onIntlError, resolveLocale } from './i18n'

function missingMessageError(): IntlError {
  return new IntlError(IntlErrorCode.MISSING_MESSAGE, 'missing')
}

describe('resolveLocale', () => {
  test('keeps a valid cookie value', () => {
    expect(resolveLocale('en')).toBe('en')
  })

  test('falls back to the default locale for an unrecognized value', () => {
    expect(resolveLocale('fr')).toBe('es')
  })

  test('falls back to the default locale when the cookie is absent', () => {
    expect(resolveLocale(undefined)).toBe('es')
  })
})

describe('getMessageFallback', () => {
  test('renders the dotted key path so a missing message is visible', () => {
    expect(getMessageFallback({ namespace: 'jobLauncher', key: 'enqueue' })).toBe(
      'jobLauncher.enqueue',
    )
  })

  test('falls back to just the key when there is no namespace', () => {
    expect(getMessageFallback({ key: 'enqueue' })).toBe('enqueue')
  })
})

describe('onIntlError', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  test('rethrows a missing message in development, so it fails loudly', () => {
    vi.stubEnv('NODE_ENV', 'development')

    expect(() => onIntlError(missingMessageError())).toThrow()
  })

  test('logs instead of throwing in production, so one missing key cannot take the page down', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => onIntlError(missingMessageError())).not.toThrow()
    expect(consoleError).toHaveBeenCalledOnce()
  })
})
