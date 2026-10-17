import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as NosotrosLib from '@/app/lib/nosotros'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateNosotrosActivity: vi.fn(),
  deleteNosotrosActivity: vi.fn(),
}))

// `@/app/lib/nosotros` imports `prisma` at module scope, which throws if
// `DATABASE_URL` is unset — as it is here. The real module is still loaded
// below (via `importOriginal`) so `nosotrosActivityUpdateSchema` stays real,
// but with `prisma` stubbed out first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
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

const activityId = '5f0b1c9e-3d2a-4f6b-9c8d-7e6f5a4b3c2d'
const params = Promise.resolve({ id: activityId })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const VERSION = '2026-01-01T00:00:00.000Z'
const validBody = {
  version: VERSION,
  icon: 'waves',
  content: {
    es: { title: 'Nuevo título', description: 'Nuevo texto' },
    en: { title: 'New title', description: 'New text' },
  },
}

function patchRequest(body: unknown) {
  return new Request(`http://localhost/api/nosotros/activities/${activityId}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request(`http://localhost/api/nosotros/activities/${activityId}`, { method: 'DELETE' })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/nosotros/activities/[id]', () => {
  test('rejects a request the edit_components guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('invalid-json')
    expect(mocks.updateNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects a body without a version and lists which fields to fix', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ icon: 'waves' }), { params })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('invalid-body')
    expect(body.issues).toEqual([
      {
        path: 'version',
        message: 'La versión de la actividad es obligatoria y debe ser la que se cargó.',
      },
    ])
    expect(mocks.updateNosotrosActivity).not.toHaveBeenCalled()
  })

  test('rejects a request that changes nothing', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ version: VERSION }), { params })

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('invalid-body')
    expect(mocks.updateNosotrosActivity).not.toHaveBeenCalled()
  })

  test('returns 400 for an id that is not a uuid, without querying the database', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest(validBody), {
      params: Promise.resolve({ id: 'abc' }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid-id' })
    expect(mocks.updateNosotrosActivity).not.toHaveBeenCalled()
  })

  test('returns 404 when the activity does not exist, saying it may have been deleted', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNosotrosActivity.mockResolvedValue({ ok: false, reason: 'not-found' })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error:
        'Esta actividad ya no existe. Es posible que otra persona la haya eliminado; recargue la página.',
      code: 'not-found',
    })
  })

  test('returns 409 when the activity changed since it was opened', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNosotrosActivity.mockResolvedValue({ ok: false, reason: 'conflict' })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'La actividad cambió desde que la abrió. Recárguela y vuelva a aplicar sus cambios.',
      code: 'conflict',
    })
  })

  test('returns 400 listing the translations that still need review', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNosotrosActivity.mockResolvedValue({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('review-required')
    expect(body.pending).toEqual([{ path: 'content.en.title', locale: 'en', field: 'title' }])
  })

  test('answers an unexpected failure without exposing its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNosotrosActivity.mockRejectedValue(new Error('connection refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'No se pudieron guardar los cambios.',
      code: 'internal-error',
    })
  })

  test('saves the change and stamps modifiedBy with the current admin', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const saved = { id: activityId, icon: 'waves', modifiedAt: '2026-01-02T00:00:00.000Z' }
    mocks.updateNosotrosActivity.mockResolvedValue({ ok: true, activity: saved })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ activity: saved })
    expect(mocks.updateNosotrosActivity).toHaveBeenCalledWith(activityId, validBody, adminUser.id)
  })

  test('accepts an icon-only update', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateNosotrosActivity.mockResolvedValue({ ok: true, activity: { id: activityId } })

    const response = await PATCH(patchRequest({ version: VERSION, icon: 'code' }), { params })

    expect(response.status).toBe(200)
    expect(mocks.updateNosotrosActivity).toHaveBeenCalledWith(
      activityId,
      { version: VERSION, icon: 'code' },
      adminUser.id,
    )
  })
})

describe('DELETE /api/nosotros/activities/[id]', () => {
  test('rejects a request the delete_components guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteNosotrosActivity).not.toHaveBeenCalled()
  })

  test('returns 400 for an id that is not a uuid, without querying the database', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id: 'abc' }) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid-id' })
    expect(mocks.deleteNosotrosActivity).not.toHaveBeenCalled()
  })

  test('answers an unexpected failure without exposing its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNosotrosActivity.mockRejectedValue(new Error('connection refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'No se pudo eliminar la actividad.',
      code: 'internal-error',
    })
  })

  test('returns 404 when the activity does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNosotrosActivity.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
  })

  test('deletes the activity and returns no content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteNosotrosActivity.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteNosotrosActivity).toHaveBeenCalledWith(activityId)
  })
})
