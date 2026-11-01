import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as Gallery from '@/app/lib/gallery'

const mocks = vi.hoisted(() => ({
  createGalleryMedia: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/gallery', async (importOriginal) => {
  const original = await importOriginal<typeof Gallery>()
  return { ...original, createGalleryMedia: mocks.createGalleryMedia }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

import { POST } from './route'

const albumId = '39bf18d8-e9ab-44c9-9043-71121c3bc2d9'
const body = {
  content: {
    es: {
      title: 'Montaje',
      description: 'Montaje del reflector.',
      altText: 'Reflector durante el montaje.',
    },
    en: {
      title: 'Assembly',
      description: 'Assembly of the dish.',
      altText: 'Dish during assembly.',
    },
  },
  objectKey: 'gallery/montaje.jpg',
  format: 'JPG',
  date: '2026-02-16',
  uploader: 'LASCE',
}

function paramsFor(id: string) {
  return { params: Promise.resolve({ albumId: id }) }
}

function postRequest(input: unknown, id = albumId) {
  return new Request(`http://localhost/api/gallery/albums/${id}/media`, {
    method: 'POST',
    body: typeof input === 'string' ? input : JSON.stringify(input),
  })
}

async function post(input: unknown, id = albumId) {
  const response = await POST(postRequest(input, id), paramsFor(id))
  return { response, body: await response.json() }
}

beforeEach(() => {
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.createGalleryMedia.mockResolvedValue({
    ok: true,
    media: {
      id: 'media-id',
      title: body.content.es.title,
      description: body.content.es.description,
      alt: body.content.es.altText,
      objectKey: body.objectKey,
      format: body.format,
      isVideo: false,
      colSpan: 1,
      rowSpan: 1,
      date: body.date,
      uploader: body.uploader,
    },
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('POST /api/gallery/albums/[albumId]/media', () => {
  test('requires create_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(body), paramsFor(albumId))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createGalleryMedia).not.toHaveBeenCalled()
  })

  test('rejects an invalid album id, malformed JSON, and invalid media metadata', async () => {
    const badId = await post(body, 'not-a-uuid')
    expect(badId.response.status).toBe(400)
    expect(badId.body.code).toBe('invalid-id')

    const badJson = await post('{')
    expect(badJson.response.status).toBe(400)
    expect(badJson.body.code).toBe('invalid-json')

    const invalid = await post({
      ...body,
      content: {
        ...body.content,
        en: { ...body.content.en, altText: '' },
      },
    })
    expect(invalid.response.status).toBe(400)
    expect(invalid.body.issues).toContainEqual(
      expect.objectContaining({ path: 'content.en.altText' }),
    )
    expect(mocks.createGalleryMedia).not.toHaveBeenCalled()
  })

  test('returns not-found and conflict write failures', async () => {
    mocks.createGalleryMedia.mockResolvedValue({ ok: false, reason: 'album-not-found' })

    const { response, body: notFound } = await post(body)

    expect(response.status).toBe(404)
    expect(notFound).toEqual({
      code: 'not-found',
      error: 'No existe el álbum indicado.',
    })
    expect(mocks.createGalleryMedia).toHaveBeenCalledWith(
      albumId,
      {
        ...body,
        isVideo: false,
        colSpan: 1,
        rowSpan: 1,
      },
      expect.anything(),
    )

    mocks.createGalleryMedia.mockResolvedValueOnce({ ok: false, reason: 'conflict' })
    const conflict = await post(body)
    expect(conflict.response.status).toBe(409)
    expect(conflict.body.code).toBe('conflict')
  })

  test('creates media and returns no-store JSON', async () => {
    const { response, body: json } = await post(body)

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(json).toEqual({
      media: {
        id: 'media-id',
        title: body.content.es.title,
        description: body.content.es.description,
        alt: body.content.es.altText,
        objectKey: body.objectKey,
        format: body.format,
        isVideo: false,
        colSpan: 1,
        rowSpan: 1,
        date: body.date,
        uploader: body.uploader,
      },
    })
  })
})
