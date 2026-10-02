import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as Gallery from '@/app/lib/gallery'

const mocks = vi.hoisted(() => ({
  createGallerySubAlbum: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/gallery', async (importOriginal) => {
  const original = await importOriginal<typeof Gallery>()
  return { ...original, createGallerySubAlbum: mocks.createGallerySubAlbum }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

import { POST } from './route'

const parentAlbumId = 'd373bcfb-dd4c-486d-a6f2-a5282d8bc65e'
const input = {
  slug: 'cimentacion',
  title: 'Cimentación',
  description: 'Construcción de la base.',
}
const adminUser = { id: 'admin-1', role: 'ADMIN' }

function postRequest(body: unknown) {
  return new Request(`http://localhost/api/gallery/albums/${parentAlbumId}`, {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/gallery/albums/[parentAlbumId]', () => {
  test('requires create_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(input), { params: Promise.resolve({ parentAlbumId }) })

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createGallerySubAlbum).not.toHaveBeenCalled()
  })

  test('rejects an invalid parent id or malformed body', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    const badIdResponse = await POST(postRequest(input), {
      params: Promise.resolve({ parentAlbumId: 'not-a-uuid' }),
    })
    expect(badIdResponse.status).toBe(400)
    expect(
      (
        await POST(postRequest('bad json'), {
          params: Promise.resolve({ parentAlbumId }),
        })
      ).status,
    ).toBe(400)
    expect(
      (
        await POST(postRequest({ ...input, sectionId: 'another-section' }), {
          params: Promise.resolve({ parentAlbumId }),
        })
      ).status,
    ).toBe(400)
    expect(mocks.createGallerySubAlbum).not.toHaveBeenCalled()
  })

  test('rejects attempts to nest a sub-album under another sub-album', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createGallerySubAlbum.mockResolvedValue({
      ok: false,
      reason: 'parent-not-top-level',
    })

    const response = await POST(postRequest(input), { params: Promise.resolve({ parentAlbumId }) })

    expect(response.status).toBe(400)
    expect(mocks.createGallerySubAlbum).toHaveBeenCalledWith(parentAlbumId, input)
  })

  test('returns not found for an unknown parent', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createGallerySubAlbum.mockResolvedValue({ ok: false, reason: 'parent-not-found' })

    const response = await POST(postRequest(input), { params: Promise.resolve({ parentAlbumId }) })

    expect(response.status).toBe(404)
  })

  test('creates and returns the sub-album', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const album = { id: 'sub-1', ...input, parentAlbumId }
    mocks.createGallerySubAlbum.mockResolvedValue({ ok: true, album })

    const response = await POST(postRequest(input), { params: Promise.resolve({ parentAlbumId }) })

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ album })
  })
})
