import { beforeEach, describe, expect, test, vi } from 'vitest'

import es from '@/messages/es.json'

const cookieStore = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))
// next-intl only registers the function; returning it lets the test call it as a request would.
vi.mock('next-intl/server', () => ({ getRequestConfig: (config: unknown) => config }))

const { default: requestConfig } = await import('./request')
const resolveRequest = requestConfig as unknown as () => Promise<{
  locale: string
  messages: typeof es
  timeZone: string
}>

beforeEach(() => {
  cookieStore.get.mockReset()
})

describe('request configuration', () => {
  test('renders in Spanish when the visitor has not chosen a language', async () => {
    cookieStore.get.mockReturnValue(undefined)

    const config = await resolveRequest()

    expect(cookieStore.get).toHaveBeenCalledWith('lasce_locale')
    expect(config.locale).toBe('es')
    expect(config.messages).toEqual(es)
  })

  test('renders in the language stored in the cookie', async () => {
    cookieStore.get.mockReturnValue({ value: 'en' })

    const config = await resolveRequest()

    expect(config.locale).toBe('en')
    expect(config.messages.nav.home).toBe('Home')
  })

  test('renders in Spanish when the cookie holds an unsupported language', async () => {
    cookieStore.get.mockReturnValue({ value: 'fr' })

    expect((await resolveRequest()).locale).toBe('es')
  })

  test('shows dates and times in Costa Rica time', async () => {
    cookieStore.get.mockReturnValue(undefined)

    expect((await resolveRequest()).timeZone).toBe('America/Costa_Rica')
  })
})
