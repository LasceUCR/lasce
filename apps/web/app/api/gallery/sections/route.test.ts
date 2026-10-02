import { afterEach, describe, expect, test, vi } from 'vitest'
import type * as Gallery from '@/app/lib/gallery'

const mocks = vi.hoisted(() => ({
  createGallerySection: vi.fn(),
  requireApiPermission: vi.fn(),
}))

vi.mock('@lasce/db', () => ({ prisma: {} }))

vi.mock('@/app/lib/gallery', async (importOriginal) => {
  const original = await importOriginal<typeof Gallery>()
  return { ...original, createGallerySection: mocks.createGallerySection }
})

vi.mock('@/app/lib/auth/apiGuard', () => ({
  requireApiPermission: mocks.requireApiPermission,
}))

import { POST } from './route'

const input = { title: 'Fotos ROSAC', description: 'Galería del observatorio.' }
const adminUser = { id: 'admin-1', role: 'ADMIN' }

function postRequest(body: unknown) {
  return new Request('http://localhost/api/gallery/sections', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/gallery/sections', () => {
  test('requires create_components permission', async () => {
    const denied = new Response(JSON.stringify({ error: 'denied' }), { status: 403 })
    mocks.requireApiPermission.mockResolvedValue({ ok: false, response: denied })

    const response = await POST(postRequest(input))

    expect(response).toBe(denied)
    expect(mocks.requireApiPermission).toHaveBeenCalledWith('create_components')
    expect(mocks.createGallerySection).not.toHaveBeenCalled()
  })

  test('rejects malformed JSON and invalid section data', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })

    expect((await POST(postRequest('not json'))).status).toBe(400)
    expect((await POST(postRequest({ title: '  ' }))).status).toBe(400)
    expect(mocks.createGallerySection).not.toHaveBeenCalled()
  })

  test('creates a section and returns no-store JSON', async () => {
    mocks.requireApiPermission.mockResolvedValue({ ok: true, user: adminUser })
    const section = { id: 'section-1', ...input }
    mocks.createGallerySection.mockResolvedValue(section)

    const response = await POST(postRequest(input))

    expect(response.status).toBe(201)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ section })
    expect(mocks.createGallerySection).toHaveBeenCalledWith(input)
  })
})
