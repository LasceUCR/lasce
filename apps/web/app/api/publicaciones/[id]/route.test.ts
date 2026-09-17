import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as PublicationsLib from '@/app/lib/publications'

const mocks = vi.hoisted(() => ({
  requireApiPermission: vi.fn(),
  updatePublication: vi.fn(),
  deletePublication: vi.fn(),
}))

// `@/app/lib/publications` imports `prisma` at module scope.
vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('@/app/lib/publications', async (importOriginal) => {
  const original = await importOriginal<typeof PublicationsLib>()

  return {
    ...original,
    updatePublication: mocks.updatePublication,
    deletePublication: mocks.deletePublication,
  }
})

import { DELETE, PATCH } from './route'

const params = Promise.resolve({ id: 'abc' })
const adminUser = { id: 'admin-1', role: 'ADMIN' }

const validBody = {
  title: 'Nueva publicación',
  abstract: 'Un resumen de la publicación.',
  authors: ['Juan Pérez', 'María Rodríguez'],
  DOI: '10.1234/example',
  researchGroup: 'LASCE',
  venue: 'Solar Physics',
  date: '2026-01-01',
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/publicaciones/abc', {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest() {
  return new Request('http://localhost/api/publicaciones/abc', {
    method: 'DELETE',
  })
}

function deniedResponse(status: number) {
  return new Response(JSON.stringify({ error: 'denied' }), { status })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/publicaciones/[id]', () => {
  test('rejects a request the admin guard denies', async () => {
    const denied = deniedResponse(401)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response).toBe(denied)
    expect(mocks.updatePublication).not.toHaveBeenCalled()
  })

  test('rejects a body that is not valid JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(patchRequest('not json'), { params })

    expect(response.status).toBe(400)
    expect(mocks.updatePublication).not.toHaveBeenCalled()
  })

  test('rejects a body missing required fields and lists which ones', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const response = await PATCH(
      patchRequest({
        title: '',
        abstract: '',
        authors: [],
      }),
      { params },
    )

    expect(response.status).toBe(400)

    const body = await response.json()

    expect(body.issues).toMatchObject({
      title: expect.any(Array),
      abstract: expect.any(Array),
      authors: expect.any(Array),
    })

    expect(mocks.updatePublication).not.toHaveBeenCalled()
  })

  test('returns 404 when the publication does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.updatePublication.mockResolvedValue(null)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(404)
  })

  test('saves the publication changes', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const saved = {
      slug: 'abc',
      title: validBody.title,
      authors: validBody.authors,
      venue: validBody.venue,
      year: '2026',
      date: new Date('2026-01-01'),
      abstract: validBody.abstract,
      href: validBody.DOI,
      researchGroup: validBody.researchGroup,
    }

    mocks.updatePublication.mockResolvedValue(saved)

    const response = await PATCH(patchRequest(validBody), { params })

    expect(response.status).toBe(200)

    expect(await response.json()).toEqual({
      publication: {
        ...saved,
        date: saved.date.toISOString(),
      },
    })

    expect(mocks.updatePublication).toHaveBeenCalledWith('abc', {
      ...validBody,
      date: new Date('2026-01-01'),
    })
  })
})

describe('DELETE /api/publicaciones/[id]', () => {
  test('rejects a request the admin guard denies', async () => {
    const denied = deniedResponse(403)
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), { params })

    expect(response).toBe(denied)
    expect(mocks.deletePublication).not.toHaveBeenCalled()
  })

  test('returns 404 when the publication does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deletePublication.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(404)
  })

  test('deletes the publication and returns no content', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.deletePublication.mockResolvedValue(true)

    const response = await DELETE(deleteRequest(), { params })

    expect(response.status).toBe(204)
    expect(mocks.deletePublication).toHaveBeenCalledWith('abc')
  })
})
