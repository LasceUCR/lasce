import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const cookieStore = vi.hoisted(() => ({ set: vi.fn() }))

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))

const { setLocale } = await import('./actions')

beforeEach(() => {
  cookieStore.set.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('setLocale', () => {
  test('stores a supported language for a year, for the whole site', async () => {
    await setLocale('en')

    expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith(
      'lasce_locale',
      'en',
      expect.objectContaining({ path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 }),
    )
  })

  test('stores nothing for an unsupported language', async () => {
    await setLocale('fr')
    await setLocale('')

    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  test('marks the cookie secure only in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await setLocale('en')
    vi.stubEnv('NODE_ENV', 'development')
    await setLocale('es')

    expect(cookieStore.set.mock.calls.map(([, , options]) => options.secure)).toEqual([true, false])
  })
})
