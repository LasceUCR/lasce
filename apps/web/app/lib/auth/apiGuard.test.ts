import { describe, expect, test, vi } from 'vitest'

const getSessionUser = vi.fn()
const getPermissionsForRole = vi.fn()

vi.mock('./session', () => ({ getSessionUser }))
vi.mock('./permission-store', () => ({ getPermissionsForRole }))

const { requireApiPermission } = await import('./apiGuard')

describe('requireApiPermission', () => {
  test('rejects an anonymous request with 401', async () => {
    getSessionUser.mockResolvedValue(null)

    const result = await requireApiPermission('edit_components')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }
    expect(getPermissionsForRole).not.toHaveBeenCalled()
  })

  test('rejects a signed-in user without the grant, with 403', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', role: 'ASSISTANT' })
    getPermissionsForRole.mockResolvedValue(new Set(['edit_components', 'download_resources']))

    const result = await requireApiPermission('create_components')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(403)
    }
    expect(getPermissionsForRole).toHaveBeenCalledWith('ASSISTANT')
  })

  test('accepts an assistant who holds the asked grant', async () => {
    const assistant = { id: 'asst-1', role: 'ASSISTANT' }
    getSessionUser.mockResolvedValue(assistant)
    getPermissionsForRole.mockResolvedValue(new Set(['edit_components', 'download_resources']))

    const result = await requireApiPermission('edit_components')

    expect(result).toEqual({ ok: true, user: assistant })
  })

  test('accepts an administrator who holds the asked grant', async () => {
    const admin = { id: 'admin-1', role: 'ADMIN' }
    getSessionUser.mockResolvedValue(admin)
    getPermissionsForRole.mockResolvedValue(
      new Set(['create_components', 'edit_components', 'delete_components']),
    )

    const result = await requireApiPermission('delete_components')

    expect(result).toEqual({ ok: true, user: admin })
  })
})
