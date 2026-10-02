import { afterEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getPermissionsForRole: vi.fn(),
}))

vi.mock('@/app/lib/auth/session', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('@/app/lib/auth/permission-store', () => ({
  getPermissionsForRole: mocks.getPermissionsForRole,
}))

import { requestResourceDownload } from './actions'

const today = new Date().toISOString().slice(0, 10)
const goesData = {
  query: {
    source: 'GOES',
    product: 'SFXR',
    parameter: '0.1-0.8nm',
    date: today,
    startTime: '08:00',
    endTime: '09:00',
  },
  format: 'csv',
}

function signIn(role: string, grants: string[]) {
  mocks.getSessionUser.mockResolvedValue({ id: 'user-1', role })
  mocks.getPermissionsForRole.mockResolvedValue(new Set(grants))
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('requestResourceDownload', () => {
  test('asks an anonymous visitor to sign in, including one whose session expired', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    expect(await requestResourceDownload(goesData)).toEqual({
      ok: false,
      reason: 'unauthenticated',
      message: 'Inicie sesión para descargar recursos.',
    })
    expect(mocks.getPermissionsForRole).not.toHaveBeenCalled()
  })

  test("denies a signed-in user whose role lacks the resource's permission", async () => {
    signIn('VISITOR', ['download_resources'])

    expect(await requestResourceDownload(goesData)).toEqual({
      ok: false,
      reason: 'forbidden',
      message: 'No tienes autorización para descargar recursos GOES.',
    })
    expect(mocks.getPermissionsForRole).toHaveBeenCalledWith('VISITOR')
  })

  test('lets a permitted user past validation', async () => {
    signIn('ADMIN', ['download_resources', 'download_goes_resources'])

    expect(await requestResourceDownload(goesData)).toMatchObject({
      ok: false,
      reason: 'unavailable',
    })
  })

  test('rejects a request the policy does not offer', async () => {
    signIn('ADMIN', ['download_resources', 'download_goes_resources'])

    expect(
      await requestResourceDownload({
        ...goesData,
        query: { ...goesData.query, product: 'Fe171', parameter: 'image' },
      }),
    ).toMatchObject({ ok: false, reason: 'unsupported' })
  })
})
