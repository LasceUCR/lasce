import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as AcademicActivitiesLib from '@/app/lib/academic-activities'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateAcademicActivity: vi.fn(),
  deleteAcademicActivity: vi.fn(),
}))

// `@/app/lib/academic-activities` imports `prisma` at module scope, which throws if
// `DATABASE_URL` is unset — as it is here. The real module is still loaded below (via
// `importOriginal`) so `academicActivityUpdateSchema` stays real, but with `prisma` stubbed out
// first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/academic-activities', async (importOriginal) => {
  const original = await importOriginal<typeof AcademicActivitiesLib>()
  return {
    ...original,
    updateAcademicActivity: mocks.updateAcademicActivity,
    deleteAcademicActivity: mocks.deleteAcademicActivity,
  }
})

import { DELETE, PATCH } from './route'

const activityId = '5f0b1c9e-3d2a-4f6b-9c8d-7e6f5a4b3c2d'
const params = Promise.resolve({ id: activityId })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const VERSION = '2026-01-01T00:00:00.000Z'

const content = {
  es: {
    title: 'Taller de prueba',
    category: 'Taller',
    description: 'Descripción.',
    photoAlt: 'Texto alternativo.',
  },
  en: {
    title: 'Test workshop',
    category: 'Workshop',
    description: 'Description.',
    photoAlt: 'Alt text.',
  },
}

const validBody = {
  version: VERSION,
  content,
  startDate: '2026-02-16',
  endDate: '2026-02-20',
  location: 'San José, Costa Rica',
  photoUrl: '/images/mock.jpg',
}

function patchRequest(body: unknown) {
  return new Request(`http://localhost/api/academic-activities/${activityId}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request(`http://localhost/api/academic-activities/${activityId}`, {
    method: 'DELETE',
  })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/academic-activities/[id]', () => {
  test('rejects a request the edit_components guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateAcademicActivity).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updateAcademicActivity).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields and lists which ones', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(
      patchRequest({
        ...validBody,
        content: { ...content, es: { ...content.es, title: '' } },
        location: '',
      }),
      { params },
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'content.es.title' }),
        expect.objectContaining({ path: 'location' }),
      ]),
    )
    expect(mocks.updateAcademicActivity).not.toHaveBeenCalled()
  })

  test('returns 400 for an id that is not a uuid, without querying the database', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest(validBody), {
      params: Promise.resolve({ id: 'abc' }),
    })

    expect(response.status).toBe(400)
    expect(mocks.updateAcademicActivity).not.toHaveBeenCalled()
  })

  test('returns 404 when the activity does not exist, saying it may have been deleted', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateAcademicActivity.mockResolvedValue({ ok: false, reason: 'not-found' })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe(
      'Esta actividad ya no existe. Es posible que otra persona la haya eliminado; recargue la página.',
    )
  })

  test('returns a conflict when the activity changed since it was loaded', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateAcademicActivity.mockResolvedValue({ ok: false, reason: 'conflict' })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('conflict')
  })

  test('asks the editor to review when a translation changed in one language only', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateAcademicActivity.mockResolvedValue({
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

  test('explains a database failure instead of throwing', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateAcademicActivity.mockRejectedValue(new Error('connection refused'))

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(500)
    expect((await response.json()).error).toBe('No se pudieron guardar los cambios.')
  })

  test('saves the change and stamps modifiedBy with the current admin', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const saved = { id: activityId, title: 'Taller de prueba', date: '16-20 febrero, 2026' }
    mocks.updateAcademicActivity.mockResolvedValue({ ok: true, activity: saved })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ activity: saved })
    expect(mocks.updateAcademicActivity).toHaveBeenCalledWith(activityId, validBody, adminUser.id)
  })
})

describe('DELETE /api/academic-activities/[id]', () => {
  test('rejects a request the delete_components guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteAcademicActivity).not.toHaveBeenCalled()
  })

  test('returns 400 for an id that is not a uuid, without querying the database', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id: 'abc' }) })

    expect(response.status).toBe(400)
    expect(mocks.deleteAcademicActivity).not.toHaveBeenCalled()
  })

  test('explains a database failure instead of throwing', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteAcademicActivity.mockRejectedValue(new Error('connection refused'))

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(500)
    expect((await response.json()).error).toBe('No se pudo eliminar la actividad.')
  })

  test('returns 404 when the activity does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteAcademicActivity.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
  })

  test('deletes the activity and returns no content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteAcademicActivity.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteAcademicActivity).toHaveBeenCalledWith(activityId, adminUser)
  })
})
