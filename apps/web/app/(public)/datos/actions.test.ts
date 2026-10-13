import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getPermissionsForRole: vi.fn(),
  createResourceDownload: vi.fn(),
}))

vi.mock('@/app/lib/auth/session', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('@/app/lib/auth/permission-store', () => ({
  getPermissionsForRole: mocks.getPermissionsForRole,
}))
vi.mock('@/app/services/downloads/downloadService', () => ({
  createResourceDownload: mocks.createResourceDownload,
}))

import { ScientificDataUpstreamError } from '@/app/services/scientific-data/errors'

import { requestResourceDownload } from './actions'

const request = { query: {}, format: 'png' }

afterEach(() => {
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
