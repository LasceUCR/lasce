import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as Gallery from '@/app/lib/gallery'

const mocks = vi.hoisted(() => ({
  deleteGalleryMedia: vi.fn(),
  updateGalleryMedia: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/gallery', async (importOriginal) => {
  const original = await importOriginal<typeof Gallery>()
  return {
    ...original,
    deleteGalleryMedia: mocks.deleteGalleryMedia,
    updateGalleryMedia: mocks.updateGalleryMedia,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

import { DELETE, PATCH } from './route'

const mediaId = '39bf18d8-e9ab-44c9-9043-71121c3bc2d9'
const version = '2026-09-01T10:00:00.000Z'
const patchBody = {
  version,
  content: {
    es: {
      title: 'Título nuevo',
      description: 'Descripción actualizada.',
      altText: 'Texto alternativo actualizado.',
    },
    en: {
      title: 'Updated title',
      description: 'Updated description.',
      altText: 'Updated alt text.',
    },
  },
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ mediaId: id }) }
}

function deleteRequest(id = mediaId) {
  return new Request(`http://localhost/api/gallery/media/${id}`, { method: 'DELETE' })
}

function patchRequest(body: unknown, id = mediaId) {
  return new Request(`http://localhost/api/gallery/media/${id}`, {
    method: 'PATCH',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function patch(body: unknown, id = mediaId) {
  const response = await PATCH(patchRequest(body, id), paramsFor(id))
  return { response, body: await response.json() }
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.updateGalleryMedia.mockResolvedValue({
    ok: true,
    media: {
      id: mediaId,
      title: patchBody.content.es.title,
      description: patchBody.content.es.description,
      alt: patchBody.content.es.altText,
      objectKey: 'gallery/montaje.jpg',
      format: 'JPG',
      isVideo: false,
      colSpan: 1,
      rowSpan: 1,
      date: '2026-02-16',
      uploader: 'LASCE',
    },
  })
  mocks.deleteGalleryMedia.mockResolvedValue(true)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('PATCH /api/gallery/media/[mediaId]', () => {
  test('requires edit_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await PATCH(patchRequest(patchBody), paramsFor(mediaId))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('edit_components')
    expect(mocks.updateGalleryMedia).not.toHaveBeenCalled()
  })

  test('rejects invalid ids, malformed JSON, empty updates, and invalid values', async () => {
    const badId = await patch(patchBody, 'not-a-uuid')
    expect(badId.response.status).toBe(400)
    expect(badId.body.code).toBe('invalid-id')

    const badJson = await patch('{')
    expect(badJson.response.status).toBe(400)
    expect(badJson.body.code).toBe('invalid-json')

    const empty = await patch({ version })
    expect(empty.response.status).toBe(400)
    expect(empty.body.issues).toEqual([
      { path: '', message: 'La solicitud no incluye ningún campo para actualizar.' },
    ])

    const invalid = await patch({ version, rowSpan: 0 })
    expect(invalid.response.status).toBe(400)
    expect(invalid.body.issues).toContainEqual(expect.objectContaining({ path: 'rowSpan' }))
    expect(mocks.updateGalleryMedia).not.toHaveBeenCalled()
  })

  test('rejects confirmations without content and the removed flat title field', async () => {
    const confirmations = await patch({
      version,
      rowSpan: 2,
      confirmedUnchanged: [{ locale: 'en', field: 'title' }],
    })

    expect(confirmations.response.status).toBe(400)
    expect(confirmations.body.issues).toContainEqual(
      expect.objectContaining({ path: 'confirmedUnchanged' }),
    )

    const flat = await patch({ version, title: 'Título nuevo' })
    expect(flat.response.status).toBe(400)
    expect(flat.body.issues).toContainEqual({
      path: 'title',
      message: 'Campo no permitido: title.',
    })
  })

  test('maps not-found, conflict, and review-required errors', async () => {
    mocks.updateGalleryMedia.mockResolvedValueOnce({ ok: false, reason: 'not-found' })
    const notFound = await patch(patchBody)
    expect(notFound.response.status).toBe(404)
    expect(notFound.body).toEqual({
      code: 'not-found',
      error: 'No existe el archivo indicado.',
    })

    mocks.updateGalleryMedia.mockResolvedValueOnce({ ok: false, reason: 'conflict' })
    const conflict = await patch(patchBody)
    expect(conflict.response.status).toBe(409)
    expect(conflict.body).toEqual({
      code: 'conflict',
      error:
        'El archivo cambió desde que lo abrió o ya existe. Recárguelo y vuelva a aplicar sus cambios.',
    })

    mocks.updateGalleryMedia.mockResolvedValueOnce({
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

  test('returns the updated media without caching', async () => {
    const { response, body } = await patch(patchBody)

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toEqual({
      media: {
        id: mediaId,
        title: patchBody.content.es.title,
        description: patchBody.content.es.description,
        alt: patchBody.content.es.altText,
        objectKey: 'gallery/montaje.jpg',
        format: 'JPG',
        isVideo: false,
        colSpan: 1,
        rowSpan: 1,
        date: '2026-02-16',
        uploader: 'LASCE',
      },
    })
    expect(mocks.updateGalleryMedia).toHaveBeenCalledWith(mediaId, patchBody)
  })
})

describe('DELETE /api/gallery/media/[mediaId]', () => {
  test('requires delete_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await DELETE(deleteRequest(), paramsFor(mediaId))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('delete_components')
    expect(mocks.deleteGalleryMedia).not.toHaveBeenCalled()
  })

  test('rejects an invalid media id', async () => {
    const response = await DELETE(deleteRequest('not-a-uuid'), paramsFor('not-a-uuid'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      code: 'invalid-id',
      error: 'El id del archivo no es válido.',
    })
    expect(mocks.deleteGalleryMedia).not.toHaveBeenCalled()
  })

  test('returns not-found when media does not exist', async () => {
    mocks.deleteGalleryMedia.mockResolvedValue(false)

    const response = await DELETE(deleteRequest(), paramsFor(mediaId))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      code: 'not-found',
      error: 'No existe el archivo indicado.',
    })
  })

  test('deletes the record and returns no content', async () => {
    const response = await DELETE(deleteRequest(), paramsFor(mediaId))

    expect(response.status).toBe(204)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(mocks.deleteGalleryMedia).toHaveBeenCalledWith(mediaId)
  })
})
