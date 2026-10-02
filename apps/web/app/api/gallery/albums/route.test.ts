import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as Gallery from '@/app/lib/gallery'

const mocks = vi.hoisted(() => ({
  createTopLevelGalleryAlbum: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/gallery', async (importOriginal) => {
  const original = await importOriginal<typeof Gallery>()
  return { ...original, createTopLevelGalleryAlbum: mocks.createTopLevelGalleryAlbum }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

import { POST } from './route'

const input = {
  slug: 'rosac',
  title: 'ROSAC',
  description: 'Construcción del observatorio.',
  sectionId: 'd2719cb3-9d5b-4e2d-8a11-b089d5e14d7a',
}
const adminUser = { id: 'admin-1', role: 'ADMIN' }

function postRequest(body: unknown) {
  return new Request('http://localhost/api/gallery/albums', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/gallery/albums', () => {
  test('requires create_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(input))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createTopLevelGalleryAlbum).not.toHaveBeenCalled()
  })

  test('rejects malformed or invalid album input', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    expect((await POST(postRequest('{'))).status).toBe(400)
    expect((await POST(postRequest({ ...input, sectionId: 'missing' }))).status).toBe(400)
    expect((await POST(postRequest({ ...input, parentAlbumId: 'parent-1' }))).status).toBe(400)
    expect(mocks.createTopLevelGalleryAlbum).not.toHaveBeenCalled()
  })

  test('returns not found when the section does not exist', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createTopLevelGalleryAlbum.mockResolvedValue({
      ok: false,
      reason: 'section-not-found',
    })

    const response = await POST(postRequest(input))

    expect(response.status).toBe(404)
    expect(mocks.createTopLevelGalleryAlbum).toHaveBeenCalledWith(input)
  })

  test('returns conflict for a duplicate slug', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    mocks.createTopLevelGalleryAlbum.mockResolvedValue({
      ok: false,
      reason: 'duplicate-slug',
    })

    expect((await POST(postRequest(input))).status).toBe(409)
  })

  test('creates and returns the top-level album', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const album = { id: 'album-1', ...input, parentAlbumId: null }
    mocks.createTopLevelGalleryAlbum.mockResolvedValue({ ok: true, album })

    const response = await POST(postRequest(input))

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ album })
  })
})
