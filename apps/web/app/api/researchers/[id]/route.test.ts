import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as RosacLib from '@/app/lib/rosac'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updateResearcher: vi.fn(),
  deleteResearcher: vi.fn(),
  getLocale: vi.fn(),
}))

// `@/app/lib/rosac` imports `prisma` at module scope, which throws if
// `DATABASE_URL` is unset — as it is here. The real module is still loaded
// below (via `importOriginal`) so `researcherInputSchema` stays real, but
// with `prisma` stubbed out first so importing it never touches a client.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/rosac', async (importOriginal) => {
  const original = await importOriginal<typeof RosacLib>()
  return {
    ...original,
    updateResearcher: mocks.updateResearcher,
    deleteResearcher: mocks.deleteResearcher,
  }
})

import { RosacConflictError, RosacReviewRequiredError } from '@/app/lib/rosac'

import { DELETE, PATCH } from './route'

const researcherId = '5f0b1c9e-3d2a-4f6b-9c8d-7e6f5a4b3c2d'
const params = Promise.resolve({ id: researcherId })
const adminUser = { id: 'admin-1', role: 'ADMIN' }
const validBody = {
  version: '2026-01-01T00:00:00.000Z',
  src: '/images/ROSAC/team/Updated.jpg',
  name: 'Nuevo nombre',
  institution: 'UCR',
  content: {
    es: { role: 'Investigador asociado', description: 'Texto actualizado.' },
    en: { role: 'Associate researcher', description: 'Updated text.' },
  },
}

function patchRequest(body: unknown) {
  return new Request(`http://localhost/api/researchers/${researcherId}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request(`http://localhost/api/researchers/${researcherId}`, { method: 'DELETE' })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

beforeEach(() => {
  mocks.getLocale.mockResolvedValue('es')
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/researchers/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateResearcher).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'El cuerpo de la solicitud no es JSON válido.',
      code: 'invalid-json',
    })
    expect(mocks.updateResearcher).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields and lists which ones', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest({ ...validBody, institution: '' }), { params })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('invalid-body')
    expect(body.error).toBe('Faltan campos obligatorios o no son válidos.')
    expect(body.issues).toEqual([
      { path: 'institution', message: 'La institución es obligatoria.' },
    ])
    expect(mocks.updateResearcher).not.toHaveBeenCalled()
  })

  test('returns 400 for an id that is not a uuid, without querying the database', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest(validBody), {
      params: Promise.resolve({ id: 'abc' }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'El identificador del investigador no es válido.',
      code: 'invalid-id',
    })
    expect(mocks.updateResearcher).not.toHaveBeenCalled()
  })

  test('returns 404 when the researcher does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateResearcher.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error:
        'Este investigador ya no existe. Es posible que otra persona lo haya eliminado; recargue la página.',
      code: 'not-found',
    })
  })

  test('returns 409 when the researcher changed since it was opened', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateResearcher.mockRejectedValue(new RosacConflictError())

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error:
        'El investigador cambió desde que lo abrió. Recárguelo y vuelva a aplicar sus cambios.',
      code: 'conflict',
    })
  })

  test('returns the conflict message in English when English is selected', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.getLocale.mockResolvedValue('en')
    mocks.updateResearcher.mockRejectedValue(new RosacConflictError())

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error: 'The researcher changed since you opened it. Reload and reapply your changes.',
      code: 'conflict',
    })
  })

  test('returns 400 listing the translations that still need review', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateResearcher.mockRejectedValue(
      new RosacReviewRequiredError([{ locale: 'en', field: 'role' }]),
    )

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.code).toBe('review-required')
    expect(body.pending).toEqual([{ path: 'content.en.role', locale: 'en', field: 'role' }])
  })

  test('answers an unexpected failure without exposing its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateResearcher.mockRejectedValue(new Error('connection refused'))
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
    const saved = { id: 'abc', ...validBody }
    mocks.updateResearcher.mockResolvedValue(saved)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ researcher: saved })
    expect(mocks.updateResearcher).toHaveBeenCalledWith(researcherId, validBody, adminUser.id)
  })

  test('saves a change with no photo — it is optional', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updateResearcher.mockResolvedValue({ id: 'abc', ...validBody, src: '' })

    const response = await PATCH(patchRequest({ ...validBody, src: '' }), { params })

    expect(response.status).toBe(200)
    expect(mocks.updateResearcher).toHaveBeenCalledWith(
      researcherId,
      { ...validBody, src: '' },
      adminUser.id,
    )
  })
})

describe('DELETE /api/researchers/[id]', () => {
  test('rejects a request the permission guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteResearcher).not.toHaveBeenCalled()
  })

  test('returns 400 for an id that is not a uuid, without querying the database', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ id: 'abc' }) })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'El identificador del investigador no es válido.',
      code: 'invalid-id',
    })
    expect(mocks.deleteResearcher).not.toHaveBeenCalled()
  })

  test('returns 404 when the researcher does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteResearcher.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error:
        'Este investigador ya no existe. Es posible que otra persona lo haya eliminado; recargue la página.',
      code: 'not-found',
    })
  })

  test('answers an unexpected failure without exposing its details', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteResearcher.mockRejectedValue(new Error('connection refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: 'No se pudo eliminar el investigador.',
      code: 'internal-error',
    })
  })

  test('deletes the researcher and returns no content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deleteResearcher.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deleteResearcher).toHaveBeenCalledWith(researcherId, expect.anything())
  })
})
