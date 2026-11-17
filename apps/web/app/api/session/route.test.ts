import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getPermissionsForRole: vi.fn(),
}))

vi.mock('@/app/lib/auth/session', () => ({ getSessionUser: mocks.getSessionUser }))
vi.mock('@/app/lib/auth/permission-store', () => ({
  getPermissionsForRole: mocks.getPermissionsForRole,
}))

import { GET } from './route'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/session', () => {
  test('answers signed out, uncached, without a session', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(await response.json()).toEqual({ signedIn: false })
    expect(mocks.getPermissionsForRole).not.toHaveBeenCalled()
  })

  test('derives the capabilities from the session role and the current matrix', async () => {
    mocks.getSessionUser.mockResolvedValue({ id: 'u1', fullName: 'Ana Pérez', role: 'ASSISTANT' })
    mocks.getPermissionsForRole.mockResolvedValue(new Set(['edit_components']))

    const response = await GET()

    expect(mocks.getPermissionsForRole).toHaveBeenCalledWith('ASSISTANT')
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(await response.json()).toEqual({
      signedIn: true,
      name: 'Ana Pérez',
      role: 'ASSISTANT',
      canAccessAdmin: true,
      canEdit: true,
    })
  })

  test('offers nothing privileged to a visitor, whatever the browser cookies say', async () => {
    // The handler never reads `lasce_account`: only the HttpOnly session decides.
    mocks.getSessionUser.mockResolvedValue({ id: 'u2', fullName: 'Visitante', role: 'VISITOR' })
    mocks.getPermissionsForRole.mockResolvedValue(new Set(['download_resources']))

    expect(await (await GET()).json()).toEqual({
      signedIn: true,
      name: 'Visitante',
      role: 'VISITOR',
      canAccessAdmin: false,
      canEdit: false,
    })
  })

  test('follows a matrix change on the next request, with no new login', async () => {
    mocks.getSessionUser.mockResolvedValue({ id: 'u1', fullName: 'Ana', role: 'ASSISTANT' })
    mocks.getPermissionsForRole.mockResolvedValueOnce(new Set(['create_components']))
    mocks.getPermissionsForRole.mockResolvedValueOnce(new Set(['download_resources']))

    expect((await (await GET()).json()).canEdit).toBe(true)
    expect((await (await GET()).json()).canEdit).toBe(false)
  })
})
