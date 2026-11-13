import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getPermissionsForRole: vi.fn(),
  createResourceDownload: vi.fn(),
}))

const intl = vi.hoisted(() => ({ locale: 'es' as 'es' | 'en' }))

vi.mock('@/app/lib/auth/session', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('@/app/lib/auth/permission-store', () => ({
  getPermissionsForRole: mocks.getPermissionsForRole,
}))
vi.mock('@/app/services/downloads/downloadService', () => ({
  createResourceDownload: mocks.createResourceDownload,
}))

// `next-intl/server` resolves to next-intl's client build under Vitest, which throws outside a
// Next.js request. Mocked with the real catalogues of `intl.locale`, so assertions stay on the
// text a visitor reads, matching `request.test.ts`'s convention for `next-intl/server` callers.
vi.mock('next-intl/server', async () => {
  const { createTranslator } = await import('next-intl')
  const catalogues = {
    es: (await import('@/messages/es.json')).default,
    en: (await import('@/messages/en.json')).default,
  }
  return {
    getLocale: () => Promise.resolve(intl.locale),
    getMessages: () => Promise.resolve(catalogues[intl.locale]),
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

import { ScientificDataUpstreamError } from '@/app/services/scientific-data/errors'

import { requestResourceDownload } from './actions'

const request = { query: {}, format: 'png' }

afterEach(() => {
  intl.locale = 'es'
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('requestResourceDownload', () => {
  test('asks an anonymous visitor to sign in without generating anything', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    expect(await requestResourceDownload(request)).toEqual({
      ok: false,
      reason: 'unauthenticated',
      message: 'Inicie sesión para descargar recursos.',
    })
    expect(mocks.createResourceDownload).not.toHaveBeenCalled()
  })

  test("checks the request against the signed-in user's current grants", async () => {
    const grants = new Set(['download_resources'])
    const outcome = { ok: true, url: 'u', filename: 'f', expiresAt: 'e' }
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })
    mocks.getPermissionsForRole.mockResolvedValue(grants)
    mocks.createResourceDownload.mockResolvedValue(outcome)

    expect(await requestResourceDownload(request)).toBe(outcome)
    expect(mocks.getPermissionsForRole).toHaveBeenCalledWith('VISITOR')
    expect(mocks.createResourceDownload).toHaveBeenCalledWith({
      userId: 'user-1',
      grants,
      request,
      copy: expect.objectContaining({ sources: expect.any(Array) }),
    })
  })

  test('writes the file in the language of the request', async () => {
    intl.locale = 'en'
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })
    mocks.getPermissionsForRole.mockResolvedValue(new Set())
    mocks.createResourceDownload.mockResolvedValue({
      ok: true,
      url: 'u',
      filename: 'f',
      expiresAt: 'e',
    })

    await requestResourceDownload(request)

    const { copy } = mocks.createResourceDownload.mock.calls[0]![0]
    expect(copy.files('source')).toBe('Source')
    expect(copy.origins('exis.provider')).toBe('GOES')
  })

  test.each([
    [{ reason: 'invalid' }, 'es', 'La solicitud de descarga no es válida.'],
    [{ reason: 'futureDate' }, 'es', 'Seleccione una fecha que no sea posterior a hoy.'],
    [{ reason: 'empty' }, 'en', 'There is no data to download for the selected criteria.'],
    [
      { reason: 'unsupported' },
      'en',
      'This product does not offer downloads in the requested format.',
    ],
    [
      { reason: 'pending' },
      'es',
      'La consulta todavía se está procesando. Espere a que termine e intente la descarga nuevamente.',
    ],
  ] as const)('words the refusal %o in %s', async (refusal, locale, message) => {
    intl.locale = locale
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })
    mocks.getPermissionsForRole.mockResolvedValue(new Set())
    mocks.createResourceDownload.mockResolvedValue({ ok: false, ...refusal })

    expect(await requestResourceDownload(request)).toEqual({ ok: false, ...refusal, message })
  })

  test('names the missing permission in the visitor language', async () => {
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })
    mocks.getPermissionsForRole.mockResolvedValue(new Set())
    const refusal = { ok: false, reason: 'forbidden', permission: 'download_goes_resources' }
    mocks.createResourceDownload.mockResolvedValue(refusal)

    expect(await requestResourceDownload(request)).toEqual({
      ok: false,
      reason: 'forbidden',
      message: 'No tienes autorización para descargar recursos GOES.',
    })

    intl.locale = 'en'
    expect(await requestResourceDownload(request)).toMatchObject({
      message: 'You are not authorized to download GOES resources.',
    })
  })

  test('explains an unreachable scientific source', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })
    mocks.getPermissionsForRole.mockResolvedValue(new Set())
    mocks.createResourceDownload.mockRejectedValue(new ScientificDataUpstreamError('down'))

    expect(await requestResourceDownload(request)).toEqual({
      ok: false,
      reason: 'failed',
      message: 'No fue posible consultar la fuente científica. Inténtelo nuevamente más tarde.',
    })
  })

  test('turns any other failure into a retry message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })
    mocks.getPermissionsForRole.mockResolvedValue(new Set())
    mocks.createResourceDownload.mockRejectedValue(new Error('storage offline'))

    expect(await requestResourceDownload(request)).toEqual({
      ok: false,
      reason: 'failed',
      message: 'No fue posible preparar la descarga. Inténtelo nuevamente más tarde.',
    })
  })
})
