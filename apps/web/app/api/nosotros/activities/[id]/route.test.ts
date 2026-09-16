import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NosotrosLib from '@/app/lib/nosotros'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  updateNosotrosActivity: vi.fn(),
  deleteNosotrosActivity: vi.fn(),
}))

// `@/app/lib/nosotros` imports `prisma` at module scope, which throws if
// `DATABASE_URL` is unset — as it is here. The real module is still loaded
// below (via `importOriginal`) so `nosotrosActivityInputSchema` stays real,
// but with `prisma` stubbed out first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireAdmin: mocks.requireAdmin,
}))

vi.mock('@/app/lib/nosotros', async (importOriginal) => {
  const original = await importOriginal<typeof NosotrosLib>()
  return {
    ...original,
    updateNosotrosActivity: mocks.updateNosotrosActivity,
    deleteNosotrosActivity: mocks.deleteNosotrosActivity,
  }
})

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ id: 'abc' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = { icon: 'waves', title: 'Nuevo título', description: 'Nuevo texto' }

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/nosotros/activities/abc', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request('http://localhost/api/nosotros/activities/abc', { method: 'DELETE' })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/nosotros/activities/[id]', () => {
  test('rejects a request the admin guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireAdmin.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.updateNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields and lists which ones', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ icon: 'waves', title: '', description: '' }), {
      params,
    })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toMatchObject({
      title: expect.any(Array),
      description: expect.any(Array),
    })
    expect(mocks.updateNosotrosActivity).not.toHaveBeenCalled()
  })

  test('returns 404 when the activity does not exist', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNosotrosActivity.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
  })

  test('saves the change and stamps modifiedBy with the current admin', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, user: adminUser })
    const saved = { id: 'abc', ...validBody, modifiedAt: '2026-01-01T00:00:00.000Z' }
    mocks.updateNosotrosActivity.mockResolvedValue(saved)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ activity: saved })
    expect(mocks.updateNosotrosActivity).toHaveBeenCalledWith('abc', validBody, adminUser.id)
  })
})

describe('DELETE /api/nosotros/activities/[id]', () => {
  test('rejects a request the admin guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireAdmin.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.deleteNosotrosActivity).not.toHaveBeenCalled()
  })

  test('returns 404 when the activity does not exist', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNosotrosActivity.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
  })

  test('deletes the activity and returns no content', async () => {
    mocks.requireAdmin.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNosotrosActivity.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteNosotrosActivity).toHaveBeenCalledWith('abc')
  })
})
