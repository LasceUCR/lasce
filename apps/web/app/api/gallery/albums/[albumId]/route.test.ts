import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as Gallery from '@/app/lib/gallery'

const mocks = vi.hoisted(() => ({
  createGallerySubAlbum: vi.fn(),
  deleteGalleryAlbum: vi.fn(),
  updateGalleryAlbum: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/gallery', async (importOriginal) => {
  const original = await importOriginal<typeof Gallery>()
  return {
    ...original,
    createGallerySubAlbum: mocks.createGallerySubAlbum,
    deleteGalleryAlbum: mocks.deleteGalleryAlbum,
    updateGalleryAlbum: mocks.updateGalleryAlbum,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

import { DELETE, PATCH, POST } from './route'

const albumId = 'd373bcfb-dd4c-486d-a6f2-a5282d8bc65e'
const version = '2026-09-01T10:00:00.000Z'

const subAlbumBody = {
  slug: 'cimentacion',
  coverObjectKey: '/images/galeria/cimentacion-cover.jpg',
  content: {
    es: {
      title: 'Cimentación',
      description: 'Construcción de la base.',
    },
    en: {
      title: 'Foundations',
      description: 'Construction of the foundation.',
    },
  },
}

const patchBody = {
  version,
  content: {
    es: {
      title: 'ROSAC actualizado',
      description: 'Construcción del observatorio.',
    },
    en: {
      title: 'ROSAC updated',
      description: 'Construction of the observatory.',
    },
  },
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ albumId: id }) }
}

function postRequest(body: unknown, id = albumId) {
  return new Request(`http://localhost/api/gallery/albums/${id}`, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function patchRequest(body: unknown, id = albumId) {
  return new Request(`http://localhost/api/gallery/albums/${id}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function deleteRequest(id = albumId) {
  return new Request(`http://localhost/api/gallery/albums/${id}`, { method: 'DELETE' })
}

async function post(body: unknown, id = albumId) {
  const response = await POST(postRequest(body, id), paramsFor(id))
  return { response, body: await response.json() }
}

async function patch(body: unknown, id = albumId) {
  const response = await PATCH(patchRequest(body, id), paramsFor(id))
  return { response, body: await response.json() }
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.createGallerySubAlbum.mockResolvedValue({
    ok: true,
    album: {
      id: 'sub-1',
      slug: 'cimentacion',
      title: 'Cimentación',
      description: 'Construcción de la base.',
      coverObjectKey: '/images/galeria/cimentacion-cover.jpg',
      src: '/images/galeria/cimentacion-cover.jpg',
      contentLocale: 'es',
      editing: {
        content: subAlbumBody.content,
        isLegacy: false,
        version,
      },
      media: [],
    },
  })
  mocks.updateGalleryAlbum.mockResolvedValue({
    ok: true,
    album: {
      id: albumId,
      slug: 'rosac',
      title: 'ROSAC actualizado',
      description: 'Construcción del observatorio.',
      yearsLabel: '2025–2026',
      coverObjectKey: '/images/galeria/rosac-cover.jpg',
      src: '/images/galeria/rosac-cover.jpg',
      contentLocale: 'es',
      editing: {
        content: patchBody.content,
        isLegacy: false,
        version: '2026-09-02T10:00:00.000Z',
      },
      media: [],
    },
  })
  mocks.deleteGalleryAlbum.mockResolvedValue(true)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('POST /api/gallery/albums/[albumId]', () => {
  test('requires create_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(subAlbumBody), paramsFor(albumId))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createGallerySubAlbum).not.toHaveBeenCalled()
  })

  test('rejects an invalid parent id, malformed JSON, and the removed flat body', async () => {
    const badId = await post(subAlbumBody, 'not-a-uuid')
    expect(badId.response.status).toBe(400)
    expect(badId.body.code).toBe('invalid-id')

    const badJson = await post('{')
    expect(badJson.response.status).toBe(400)
    expect(badJson.body.code).toBe('invalid-json')

    const flat = await post({
      slug: 'cimentacion',
      title: 'Cimentación',
      description: 'Construcción de la base.',
    })
    expect(flat.response.status).toBe(400)
    expect(flat.body.issues).toContainEqual({
      path: 'title',
      message: 'Campo no permitido: title.',
    })
    expect(mocks.createGallerySubAlbum).not.toHaveBeenCalled()
  })

  test('returns invalid-id when asked to nest a sub-album under another sub-album', async () => {
    mocks.createGallerySubAlbum.mockResolvedValue({ ok: false, reason: 'parent-not-top-level' })

    const { response, body } = await post(subAlbumBody)

    expect(response.status).toBe(400)
    expect(body).toEqual({
      code: 'invalid-id',
      error: 'No se pueden crear subálbumes dentro de otro subálbum.',
    })
  })

  test('returns not-found for an unknown parent', async () => {
    mocks.createGallerySubAlbum.mockResolvedValue({ ok: false, reason: 'parent-not-found' })

    const { response, body } = await post(subAlbumBody)

    expect(response.status).toBe(404)
    expect(body).toEqual({
      code: 'not-found',
      error: 'No existe el álbum padre indicado.',
    })
  })

  test('creates and returns the sub-album', async () => {
    const { response, body } = await post(subAlbumBody)

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body.album).toMatchObject({ id: 'sub-1', slug: 'cimentacion' })
    expect(mocks.createGallerySubAlbum).toHaveBeenCalledWith(
      albumId,
      {
        ...subAlbumBody,
        yearsLabel: null,
      },
      expect.anything(),
    )
  })
})

describe('PATCH /api/gallery/albums/[albumId]', () => {
  test('requires edit_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(patchBody), paramsFor(albumId))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateGalleryAlbum).not.toHaveBeenCalled()
  })

  test('rejects invalid ids, malformed JSON, and missing version', async () => {
    const badId = await patch(patchBody, 'not-a-uuid')
    expect(badId.response.status).toBe(400)
    expect(badId.body.code).toBe('invalid-id')

    const badJson = await patch('{')
    expect(badJson.response.status).toBe(400)
    expect(badJson.body.code).toBe('invalid-json')

    const noVersion = await patch({ slug: 'rosac-2026' })
    expect(noVersion.response.status).toBe(400)
    expect(noVersion.body.issues).toContainEqual(expect.objectContaining({ path: 'version' }))

    expect(mocks.updateGalleryAlbum).not.toHaveBeenCalled()
  })

  test('rejects a version-only body with no change to apply', async () => {
    const { response } = await patch({ version })

    expect(response.status).toBe(400)
    expect(mocks.updateGalleryAlbum).not.toHaveBeenCalled()
  })

  test('rejects confirmations without content and the removed flat title field', async () => {
    const confirmations = await patch({
      version,
      slug: 'rosac-2026',
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(confirmations.response.status).toBe(400)
    expect(confirmations.body.issues).toContainEqual(
      expect.objectContaining({ path: 'confirmedUnchanged' }),
    )

    const flat = await patch({ version, title: 'ROSAC' })
    expect(flat.response.status).toBe(400)
    expect(flat.body.issues).toContainEqual({
      path: 'title',
      message: 'Campo no permitido: title.',
    })
  })

  test('maps not-found, duplicate-slug, conflict, and review-required errors', async () => {
    mocks.updateGalleryAlbum.mockResolvedValueOnce({ ok: false, reason: 'not-found' })
    const notFound = await patch(patchBody)
    expect(notFound.response.status).toBe(404)
    expect(notFound.body.code).toBe('not-found')

    mocks.updateGalleryAlbum.mockResolvedValueOnce({ ok: false, reason: 'duplicate-slug' })
    const duplicate = await patch(patchBody)
    expect(duplicate.response.status).toBe(409)
    expect(duplicate.body.code).toBe('duplicate-slug')

    mocks.updateGalleryAlbum.mockResolvedValueOnce({ ok: false, reason: 'conflict' })
    const conflict = await patch(patchBody)
    expect(conflict.response.status).toBe(409)
    expect(conflict.body.code).toBe('conflict')

    mocks.updateGalleryAlbum.mockResolvedValueOnce({
      ok: false,
      reason: 'review-required',
      pending: [{ locale: 'en', field: 'title' }],
    })
    const reviewRequired = await patch(patchBody)
    expect(reviewRequired.response.status).toBe(400)
    expect(reviewRequired.body).toMatchObject({
      code: 'review-required',
      pending: [{ path: 'content.en.title', locale: 'en', field: 'title' }],
    })
  })

  test('returns the updated album without caching', async () => {
    const { response, body } = await patch(patchBody)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body.album).toMatchObject({ id: albumId, title: 'ROSAC actualizado' })
    expect(mocks.updateGalleryAlbum).toHaveBeenCalledWith(albumId, patchBody, expect.anything())
  })
})

describe('DELETE /api/gallery/albums/[albumId]', () => {
  test('requires delete_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), paramsFor(albumId))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteGalleryAlbum).not.toHaveBeenCalled()
  })

  test('rejects an invalid album id', async () => {
    const response = await DELETE(deleteRequest('not-a-uuid'), paramsFor('not-a-uuid'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      code: 'invalid-id',
      error: 'El id del álbum no es válido.',
    })
    expect(mocks.deleteGalleryAlbum).not.toHaveBeenCalled()
  })

  test('returns not-found when the album does not exist', async () => {
    mocks.deleteGalleryAlbum.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), paramsFor(albumId))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      code: 'not-found',
      error: 'No existe el álbum indicado.',
    })
  })

  test('deletes the album and returns no content', async () => {
    const response = await DELETE(deleteRequest(), paramsFor(albumId))

    expect(response.status).toBe(204)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mocks.deleteGalleryAlbum).toHaveBeenCalledWith(albumId, expect.anything())
  })
})
