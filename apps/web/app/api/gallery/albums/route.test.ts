import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type * as Gallery from '@/app/lib/gallery'

const mocks = vi.hoisted(() => ({
  createTopLevelGalleryAlbum: vi.fn(),
  getGalleryAlbums: vi.fn(),
  getLocale: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/gallery', async (importOriginal) => {
  const original = await importOriginal<typeof Gallery>()
  return {
    ...original,
    createTopLevelGalleryAlbum: mocks.createTopLevelGalleryAlbum,
    getGalleryAlbums: mocks.getGalleryAlbums,
  }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

vi.mock('next-intl/server', () => ({ getLocale: mocks.getLocale }))

import { GET, POST } from './route'

const validBody = {
  slug: 'rosac',
  yearsLabel: '2025–2026',
  coverObjectKey: '/images/galeria/rosac-cover.jpg',
  content: {
    es: {
      title: 'ROSAC',
      description: 'Construcción del observatorio.',
    },
    en: {
      title: 'ROSAC',
      description: 'Construction of the observatory.',
    },
  },
}

const storedAlbum = {
  id: 'album-id',
  slug: 'rosac',
  title: 'ROSAC',
  description: 'Construcción del observatorio.',
  yearsLabel: '2025–2026',
  coverObjectKey: '/images/galeria/rosac-cover.jpg',
  src: '/images/galeria/rosac-cover.jpg',
  contentLocale: 'es',
  editing: {
    content: validBody.content,
    isLegacy: false,
    version: '2026-09-01T10:00:00.000Z',
  },
  media: [],
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/gallery/albums', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function post(body: unknown) {
  const response = await POST(postRequest(body))
  return { response, body: await response.json() }
}

beforeEach(() => {
  mocks.getLocale.mockResolvedValue('es')
  mocks.requireApiPermission.mockResolvedValue({ ok: true, user: { id: 'admin-1', role: 'ADMIN' } })
  mocks.createTopLevelGalleryAlbum.mockResolvedValue({ ok: true, album: storedAlbum })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('GET /api/gallery/albums', () => {
  test('returns albums in the resolved request locale and does not require a permission', async () => {
    const albums = [
      { id: 'album-id', slug: 'rosac', subAlbums: [{ id: 'sub-id', slug: 'montaje' }] },
    ]
    mocks.getLocale.mockResolvedValue('en')
    mocks.getGalleryAlbums.mockResolvedValue(albums)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ albums })
    expect(mocks.getGalleryAlbums).toHaveBeenCalledWith('en')
    expect(mocks.requireApiPermission).not.toHaveBeenCalled()
  })
})

describe('POST /api/gallery/albums', () => {
  test('requires create_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(validBody))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createTopLevelGalleryAlbum).not.toHaveBeenCalled()
  })

  test('rejects malformed JSON', async () => {
    const { response, body } = await post('{')

    expect(response.status).toBe(400)
    expect(body).toEqual({
      code: 'invalid-json',
      error: 'El cuerpo de la solicitud no es JSON válido.',
    })
    expect(mocks.createTopLevelGalleryAlbum).not.toHaveBeenCalled()
  })

  test('rejects the removed flat album shape and missing locales', async () => {
    const flat = await post({
      slug: 'rosac',
      title: 'ROSAC',
      description: 'Construcción del observatorio.',
    })

    expect(flat.response.status).toBe(400)
    expect(flat.body.code).toBe('invalid-body')
    expect(flat.body.issues).toEqual(
      expect.arrayContaining([
        { path: 'title', message: 'Campo no permitido: title.' },
        expect.objectContaining({ path: 'content' }),
      ]),
    )

    const missingEnglish = await post({
      ...validBody,
      content: { es: validBody.content.es },
    })

    expect(missingEnglish.response.status).toBe(400)
    expect(missingEnglish.body.issues).toContainEqual(
      expect.objectContaining({ path: 'content.en' }),
    )
    expect(mocks.createTopLevelGalleryAlbum).not.toHaveBeenCalled()
  })

  test('returns a duplicate-slug error response', async () => {
    mocks.createTopLevelGalleryAlbum.mockResolvedValue({ ok: false, reason: 'duplicate-slug' })

    const { response, body } = await post(validBody)

    expect(response.status).toBe(409)
    expect(body).toEqual({
      code: 'duplicate-slug',
      error: 'Ya existe un álbum con este slug.',
    })
  })

  test('creates and returns the top-level album', async () => {
    const { response, body } = await post(validBody)

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(body).toEqual({ album: storedAlbum })
    expect(mocks.createTopLevelGalleryAlbum).toHaveBeenCalledWith(validBody)
  })
})
