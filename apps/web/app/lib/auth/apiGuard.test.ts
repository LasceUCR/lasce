import { describe, expect, test, vi } from 'vitest'

const getSessionUser = vi.fn()

vi.mock('./session', () => ({ getSessionUser }))

const { requireAdmin } = await import('./apiGuard')

describe('requireAdmin', () => {
  test('rejects an anonymous request with 401', async () => {
    getSessionUser.mockResolvedValue(null)

    const result = await requireAdmin()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(401)
    }
  })

  test('rejects a signed-in user without the admin role, with 403', async () => {
    getSessionUser.mockResolvedValue({ id: 'user-1', role: 'VISITOR' })

    const result = await requireAdmin()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(403)
    }
  })

  test('accepts an admin and returns the user', async () => {
    const admin = { id: 'admin-1', role: 'ADMIN' }
    getSessionUser.mockResolvedValue(admin)

    const result = await requireAdmin()

    expect(result).toEqual({ ok: true, user: admin })
  })
})
